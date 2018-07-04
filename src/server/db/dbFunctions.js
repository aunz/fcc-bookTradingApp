import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcrypt'
import db from './sqlite'

export function createUser({ name, email, city = '', pw }) {
  return bcrypt.hash(pw, 10)
    .then(hash => {
      return createEntity('user', { name, email, city, pw: hash })
    })
}

export function getUserWithPW(email, pw) {
  const user = db.prepare('select * from "user" where email = ?').get(email)
  if (!user) return Promise.resolve(null)
  return bcrypt.compare(pw, user.pw).then(res => {
    return res && randomBytes(21)
  }).then(bytes => {
    if (!bytes) return null
    const token = bytes.toString('base64')
    user.token = token
    updateUser(user.id, { token })
    return user
  })
}

export function updateUser(id, object) {
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
  const stmt = `update "user" set ${sets} where id = ? and (${conds})`
  return db.prepare(stmt).run(id, object).changes
}

export function getAndUpdateUserFromToken(token) { // like findAndModify from mongo
  // get user from the given token
  // if token not found, return undefined
  // if found, check token_ts and exp, if expired, delete the token and return undefined
  // if found and ts conditions met, create new token_ts_exp and return the user

  if (!token) return undefined
  token = createHash('md5').update(token).digest()
  const user = db.prepare('select id, name, email, city from "user" where token = ?').get(token)
  if (!user) return undefined

  const now = ~~(Date.now() / 1000)
  if (user.token_ts_exp < now || user.token_ts + 31536000 < now) {
    updateUser({ id: user.id, token: null })
    return undefined
  }

  updateUser(user.id, { token_ts_exp: now + 7776000 }) // extend 90 more days
  return user
}

export function deleteToken(token) {
  if (!token) return undefined
  token = createHash('md5').update(token).digest()
  return db.prepare('update "user" set token = null, token_ts = null, token_ts_exp = null where token = ?').run(token).changes
}

export function getGBooks() { // get book id with google id
  return db.prepare('select * from book where del is null order by rowid desc').all()
}

export function getBooks(uid) {
  if (uid) return db.prepare('select * from active_book where uid = ?').all(uid)
  return db.prepare('select * from active_book').all()
}

export function getBook(id) {
  return db.prepare('select * from active_book where bid = ?').get(id)
}


export function getReqsByBook(id, all = false) {
  all = all ? '' : 'and status is null'
  return db.prepare('select * from book_user where bid = ? ' + all + ' order by rowid desc').all(id)
}

export function getReqsByUser(id, all = false) { // all requests towards this user
  all = all ? '' : 'and status is null'
  return db.prepare('select * from book_user where uid = ? ' + all + ' order by rowid desc').all(id)
}

export function getUserReqs(id, all = false) { // all requests created by this user
  all = all ? '' : 'and status is null'
  return db.prepare('select * from book_user where rid = ? ' + all + ' order by rowid desc').all(id)
}


// add a new book with gid and initial owner uid
export function addBook(gid, uid) {
  const id = createEntity('book', { gid })
  const { lastInsertROWID } = db.prepare('insert into book_user (bid, uid, rid, status) values (?, ?, ?, 1)')
    .run(id, uid, uid)
  return db.prepare('select * from book_user where rowid = ?').get(lastInsertROWID)
}

// a user rid request a book bid
export function requestBook(bid, rid) {
  return db.prepare(`
    with cte as (select uid from active_book where bid = $bid)
    insert into book_user (bid, uid, rid)
      select $bid as bid, uid, $rid as rid from cte
      where exists (select uid from cte)
  `).run({ bid, rid }).changes
}

// a user grant/decline a request
export function actBook(bid, rid, status) {
  // status = 1 (grant), 0 (decline)
  return db.prepare(`
    update book_user set status = $status
      where bid = $bid and rid = $rid
      and status is null
  `).run({ bid, rid, status }).changes
}

export function delBook(bid, uid) {
  return db.prepare('insert into book_user (bid, uid) select bid, null from active_book where bid = ? and uid = ?').run(bid, uid).changes
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

