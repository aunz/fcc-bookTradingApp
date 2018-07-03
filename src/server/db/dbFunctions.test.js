import test from 'tape'
import './createTable/createTable'
import db from './sqlite'
import {
  createUser, getUserWithPW, updateUser, getAndUpdateUserFromToken,
  addBook, requestBook, actBook, delBook,
  getReqsByUser, getUserReqs, getReqsByBook,
} from './dbFunctions'

const s = { skip: true } // eslint-disable-line

test('Create users', async t => {
  let r = new Array(10).fill(0).map((_, i) => {
    i++
    return createUser({
      name: 'U' + i,
      email: 'u' + i + '@test',
      city: 'C' + i,
      pw: '123' + i
    })
  })

  await Promise.all(r)

  r = db.prepare('select * from "user" order by rowid').all()
  t.ok(r[0].id > 10000 && r[1].id >= r[0].id + 10 && r[9].id >= r[8].id + 10 && r[9].id >= r[0].id + 90, `id starts with 10000 and jumps 10 each: ${r[0].id} ~ ${r[9].id}`)

  updateUser(r[0].id, { city: 'new city', token: '123', email: 'u4b@test' })
  r = db.prepare('select * from "user" where id = ?').get(r[0].id)
  t.ok(r.city === 'new city' && r.email === 'u4b@test' && Buffer.isBuffer(r.token), 'can update user')

  r = getAndUpdateUserFromToken('123')
  t.ok(r.city === 'new city' && r.email === 'u4b@test', 'can get user from token')

  r = await Promise.all([
    getUserWithPW('u2@test', '1232'),
    getUserWithPW('u10@test', '12310'),
  ])

  t.ok(r[0].token.length, 28, 'has token string of len 28')
  t.equal(
    r.map(el => el.id).join(' '),
    [
      db.prepare('select id from "user" where email = ?').pluck().get('u2@test'),
      db.prepare('select id from "user" where email = ?').pluck().get('u10@test')
    ].join(' '),
    'can get uid from email and pw'
  )

  r = await createUser({ name: '', email: 'u1@test', pw: '123' }).catch(e => e)
  t.ok(/SqliteError: CHECK constraint failed: user/.test(r), 'email constraint')

  r = await getUserWithPW('u2@test', 'wrong password')
  t.equal(r, null, 'cannot login with wrong password')

  t.end()
})


test('Create books', async t => {
  const u = db.prepare('select id from "user"').pluck().all()

  addBook('b0', u[0])
  addBook('b1', u[0])
  addBook('b2', u[1])
  addBook('b3', u[1])
  addBook('b4', u[2])
  addBook('b5', u[2])
  addBook('b6', u[3])
  addBook('b7', u[3])

  const b = db.prepare('select id from book').pluck().all()
  t.ok(b[0] > 10000 && b[1] >= b[0] + 10 && b[b.length - 1] >= b[b.length - 2] + 10 && b[b.length - 1] >= b[0] + ((b.length - 1) * 10), `id starts with 10000 and jumps 10 each: ${b[0]} ~ ${b[b.length - 1]}`)

  // U1,2,3 request B0
  requestBook(b[0], u[1])
  requestBook(b[0], u[2])
  requestBook(b[0], u[3])

  t.throws(function () {
    requestBook(b[0], u[3])
  }, /queue/, 'U3 has already requested B0')

  let r = db.prepare('select * from book_user where bid = ?').all(b[0])
  t.equal(r.length, 4, 'B0 has 3 requests')
  t.equal(Array.from(new Set(r.map(el => el.bid + '' + el.uid))).join(''), b[0] + '' + u[0], 'B0 belongs to U0')
  t.equal(
    r.map(el => el.rid + '' + el.status).join(''),
    u[0] + '1' + u[1] + 'null' + u[2] + 'null' + u[3] + 'null',
    'U1~3 request B0'
  )

  t.equal(actBook(b[0], u[4], 1), 0, 'B0 cannot be given to U4 as U4 did not request it')
  t.equal(actBook(b[0], u[4], 0), 0, 'B0 cannot be declined to U4 as U4 did not request it')
  t.equal(actBook(b[0], u[1], 1), 1, 'B0 is given to U1')
  r = db.prepare('select * from book_user where bid = ?').all(b[0])
  t.equal(r.length, 5, 'B0 now has 5 entries')
  t.equal(
    r.map(el => el.rid + '' + el.status).join(''),
    u[0] + '1' + u[1] + '1' + u[2] + '0' + u[3] + '0' + u[1] + '1',
    'U1 is now the owner of B0'
  )

  r = db.prepare('select * from active_book').all()
  t.equal(r[0].uid, u[1], 'B0 belongs to U1 in active_book')

  // U2, 3 request B0
  requestBook(b[0], u[2])
  requestBook(b[0], u[3])


  t.equal(actBook(b[0], u[2], 0), 1, 'B0 is declined to U2 and U3')
  r = db.prepare('select * from book_user where bid = ?').all(b[0])
  t.equal(r.length, 7, 'B0 now has 7 entries')
  t.equal(
    r.map(el => el.rid + '' + el.status).join(''),
    u[0] + '1' + u[1] + '1' + u[2] + '0' + u[3] + '0' + u[1] + '1' + u[2] + '0' + u[3] + '0',
    'U1 is still the owner of B0'
  )

  // U3, 4 request B4
  requestBook(b[4], u[3])
  requestBook(b[4], u[4])

  t.equal(delBook(b[0], u[0]), 0, 'cannot del B0 by U0 as U0 is not the owner')
  t.equal(delBook(b[4], u[3]), 0, 'cannot del B4 by U3 as U3 is not the owner')

  t.equal(delBook(b[4], u[2]), 1, 'can del B4 by U2 as U2 is the owner')
  r = db.prepare('select bid from active_book').pluck().all()
  t.equal(r.length, 7, 'only 7 books are active')
  t.ok(!r.includes(b[4]), 'B4 has been deleted in active_book')

  r = db.prepare('select bid, uid, rid, status from book_user where bid = ? order by rowid desc limit 1').get(b[4])
  t.deepEqual(r, { bid: b[4], uid: null, rid: null, status: 0 }, 'B4 has been marked deleted in user_book')

  t.equal(requestBook(b[4], u[0]), 0, 'B4 cannot be requested any more')

  // U0 request 4 books
  requestBook(b[0], u[0])
  requestBook(b[2], u[0])
  requestBook(b[3], u[0])
  requestBook(b[4], u[0])

  // U2 request 2 books
  requestBook(b[2], u[2])
  requestBook(b[3], u[2])

  r = getUserReqs(u[0])
  t.equal(
    r.length + ' ' + r.map(el => el.bid).join(' '),
    3 + ' ' + b[3] + ' ' + b[2] + ' ' + b[0],
    'U0 requested 4 books'
  )

  r = getUserReqs(u[2])
  t.equal(
    r.length + ' ' + r.map(el => el.bid).join(' '),
    2 + ' ' + b[3] + ' ' + b[2],
    'U2 requested 2 books'
  )

  r = getReqsByUser(u[1])
  t.equal(
    r.length + ' ' + r.map(el => el.bid).join(' '),
    5 + ' ' + b[3] + ' ' + b[2] + ' ' + b[3] + ' ' + b[2] + ' ' + b[0],
    'U1 has 5 requests'
  )

  r = getReqsByBook(b[0])
  t.equal(
    r.length + ' ' + r.map(el => el.rid).join(' '),
    1 + ' ' + u[0],
    'B0 is requested by U0'
  )

  r = getReqsByBook(b[2])
  r.forEach(el => { delete el.ts })
  t.equal(
    r.length + ' ' + r.map(el => el.rid).join(' '),
    2 + ' ' + u[2] + ' ' + u[0],
    'B2 is requested by U0 and U2'
  )

  r = getReqsByBook(b[1])
  t.equal(r.length, 0, 'B1 is not being requested')

  r = db.prepare('select * from book_user').all()
  r.forEach(el => { delete el.ts })
  console.log(r)
  t.end()
})
