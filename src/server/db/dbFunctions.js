import { createHash } from 'crypto'
import db from './sqlite'

// As an authenticated user, I can keep my polls and come back later to access them.
// As an authenticated user, I can share my polls with my friends.
// As an authenticated user, I can see the aggregate results of my polls.
// As an authenticated user, I can delete polls that I decide I don't want anymore.
// As an authenticated user, I can create a poll with any number of possible items.
// As an unauthenticated or authenticated user, I can see and vote on everyone's polls.
// As an unauthenticated or authenticated user, I can see the results of polls in chart form. (This could be implemented using Chart.js or Google Charts.)
// As an authenticated user, if I don't like the options on a poll, I can create a new option.


// object argument is from user input, so need to clean them

export function createIpUser(ip) {
  const id = db.prepare('select id from "user" where ip = ?').pluck().get(ip)
  return id || createEntity('user', { ip })
}

export function createAuthUser(provider, id, object = {}) {
  // provider: email, gh, fb, gg, etc,
  // object: { name, avatar etc }
  // for now, provider can only accept gh (GitHub)

  const uid = db.prepare(`select id from "user" where ${provider} = ?`).pluck().get(id)
  if (uid) return uid

  object[provider] = id
  object.auth = ~~(Date.now() / 1000)
  return createEntity('user', object)
}

export function updateUser({ id, ...object }) {
  if ('token' in object) {
    if (!object.token) { // object.token == undefined, null, 0, ''
      object.token = null
      object.token_ts = null
      object.token_ts_exp = null
    } else {
      object.token = createHash('md5').update(object.token).digest() // token is stored as hash
      object.token_ts = ~~(Date.now() / 1000)
      if (!object.token_ts_exp) object.token_ts_exp = object.token_ts + 7776000 // 90 days from now
    }
  }
  const keys = Object.keys(object)
  if (!keys.length) return 0
  const conds = keys.map(key => `(${key} != $${key} or ${key} is null or $${key} is null)`).join(' or ')

  const sets = keys.map(key => `${key} = $${key}`)
  const stmt = `update "user" set ${sets} where id = ? and (${conds}) and auth is not null`
  return db.prepare(stmt).run(id, object).changes
}

export function getAndUpdateUserFromToken(token) { // like findAndModify from mongo
  // get user from the given token
  // if token not found, return undefined
  // if found, check token_ts and exp, if expired, delete the token and return undefined
  // if found and ts conditions met, create new token_ts_exp and return the user

  if (!token) return undefined
  token = createHash('md5').update(token).digest()
  const user = db.prepare('select * from "user" where token = ?').get(token)
  if (!user) return undefined

  const now = ~~(Date.now() / 1000)
  if (user.token_ts_exp < now || user.token_ts + 31536000 < now) {
    updateUser({ id: user.id, token: null })
    return undefined
  }

  updateUser({ id: user.id, token_ts_exp: now + 7776000 }) // extend 90 more days
  return {
    id: user.id,
    name: user.name,
    gh_name: user.gh_name,
  }
}

export function deleteToken(token) {
  if (!token) return undefined
  token = createHash('md5').update(token).digest()
  return db.prepare('update "user" set token = null, token_ts = null, token_ts_exp = null where token = ?').run(token).changes
}

export function createPoll(object) { // { uid, q, o: [String, String] }
  object.o = JSON.stringify(object.o.map(k => ({ k, v: 0 })))
  return createEntity('poll', object)
}

export function addPollOption({ uid, pid, o }) { // options = [String]
  const stmts = o.map((_, i) => `
    update poll
      set o = json_insert(
        o,
        '$[' || json_array_length(o) || ']',
        json_object('k', $${i}, 'v', 0)
      )
      where id = $pid
        and del is null
        and $${i} not in (select value from json_tree(o) where key = 'k')
        and exists (select 1 from "user" where id = $uid and auth is not null)
  `)
  const bindParams = o.reduce((p, c, i) => {
    p[i] = c
    return p
  }, { uid, pid })
  return db.transaction(stmts).run(bindParams).changes
}

export function deletePoll({ uid, pid }) {
  return db.prepare('update poll set del = $ts where id = $pid and uid = $uid and del is null')
    .run({ pid, uid, ts: ~~(Date.now() / 1000) }).changes
}

export function votePoll({ uid, pid, key }) {
  // return 2, increase a key in pid by 1 when key is present, pid is not deleted, uid exists, and has not voted
  // also add key to uid votedPoll
  // return 0 otherwise
  const incVote = `
    with path as (select path || '.v' as path from json_tree((select o from poll where id = $pid)) where key = 'k' and value = $key),
      voted as (select cast(key as int) as k from json_each((select votedPoll from "user" where id = $uid)))
    update poll set o = json_replace(
        o,
        (select path from path),
        json_extract(o, (select path from path)) + 1
      )
      where id = $pid
        and del is null
        and exists (select path from path)
        and exists (select 1 from "user" where id = $uid)
        and not exists (select 1 from voted where k = $pid)`
  const addVotedPollToUser = `
    with voted as (select cast(key as int) as k from json_each((select votedPoll from "user" where id = $uid)))
    update "user" set votedPoll = json_set(
        votedPoll,
        '$.' || cast($pid as int), -- have to cast into int, otherwise there is a trailing .0
        $key
      )
      where id = $uid
        and exists (select 1 from json_tree((select o from poll where id = $pid and del is null)) where key = 'k' and value = $key)
        and not exists (select 1 from voted where k = $pid)`
  return db.transaction([incVote, addVotedPollToUser]).run({ uid, pid: pid, key }).changes
}

export function isVoted({ uid, pid }) {
  return db.prepare(`
    select exists (select 1 from "user" where id = $uid and $pid in (select cast(key as int) from json_each(votedPoll)))
  `).pluck().get({ uid, pid })
}

export function getPoll({ id }) {
  if (!id) return undefined
  return db.prepare('select id, ts, uid, q, o from poll where id = ?').get(id)
}

export function getPolls({ lim = 25, before } = {}) {
  return db.prepare(`select id, ts, uid, q, o
    from poll
    where del is null
      ${before ? 'and id < $before' : ''}
    order by id desc
    limit $lim
  `).all({ lim: Math.min(Math.max(lim, 1), 25), before })
}

export function votedPolls(id) {
  return db.prepare('select votedPoll from "user" where id = ?').pluck().get(id)
}

function createEntity(table, object) {
  // return id String, or throw error
  const keys = Object.keys(object)
  const cols = keys.length === 0 ? '' : ', ' + keys
  const values = keys.length === 0 ? '' : ', ' + keys.map(d => '$' + d)

  const stmt = `
    with cte as (select coalesce((select id from "${table}" order by rowid desc limit 1), 10000)
      + abs(random() % 10) + 10 as id)
    insert into "${table}" (id ${cols})
      values ((select id from cte) ${values})
  `
  const { lastInsertROWID } = db.prepare(stmt).run(object)
  return db.prepare(`select id from "${table}" where rowid = ?`).pluck().get(lastInsertROWID)
}

