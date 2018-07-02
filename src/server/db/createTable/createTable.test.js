import test from 'tape'
import db from '../sqlite'
import './createTable'

const s = { skip: true } // eslint-disable-line

test('init', t => {
  // create users
  db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(1, 'e1', 'p')
  db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(2, 'e2', 'p')
  db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(3, 'e3', 'p')
  db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(4, 'e4', 'p')
  db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(5, 'e5', 'p')
  db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(6, 'e6', 'p')

  // create books
  db.prepare('insert into book (id, gid) values (?, ?)').run(1, 'g1')
  db.prepare('insert into book (id, gid) values (?, ?)').run(2, 'g1')
  db.prepare('insert into book (id, gid) values (?, ?)').run(3, 'g2')
  db.prepare('insert into book (id, gid) values (?, ?)').run(4, 'g2')
  db.prepare('insert into book (id, gid) values (?, ?)').run(5, 'g3')
  db.prepare('insert into book (id, gid) values (?, ?)').run(6, 'g3')
  db.prepare('insert into book (id, gid) values (?, ?)').run(7, 'g3')
  db.prepare('insert into book (id, gid) values (?, ?)').run(8, 'g4')
  db.prepare('insert into book (id, gid) values (?, ?)').run(9, 'g5')
  db.prepare('insert into book (id, gid) values (?, ?)').run(10, 'g6')

  // assign books to users
  db.prepare('insert into book_user (bid, uid, rid, status) values (?, ?, ?, ?)').run(1, 1, 1, 1)
  db.prepare('insert into book_user (bid, uid, rid, status) values (?, ?, ?, ?)').run(2, 1, 1, 1)
  db.prepare('insert into book_user (bid, uid, rid, status) values (?, ?, ?, ?)').run(3, 2, 2, 1)
  db.prepare('insert into book_user (bid, uid, rid, status) values (?, ?, ?, ?)').run(4, 2, 2, 1)
  db.prepare('insert into book_user (bid, uid, rid, status) values (?, ?, ?, ?)').run(5, 3, 3, 1)
  db.prepare('insert into book_user (bid, uid, rid, status) values (?, ?, ?, ?)').run(6, 3, 3, 1)
  db.prepare('insert into book_user (bid, uid, rid, status) values (?, ?, ?, ?)').run(7, 4, 4, 1)
  db.prepare('insert into book_user (bid, uid, rid, status) values (?, ?, ?, ?)').run(8, 4, 4, 1)

  const n = ~~(Date.now() / 1000) + 10

  // some users request some books
  db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, n, 2) // user 2 request book 1 from user 1
  db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, n, 3) // user 3 request book 1 from user 1
  db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, n, 4) // user 4 request book 1 from user 1
  db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(3, 2, n, 5) // user 5 request book 3 from user 2

  t.end()
})

test('query', s, t => {
  let r = db.prepare(`
    select * from book_user

    --group by bid
  `).all()
  r.forEach(el => { delete el.ts })
  console.log(r)
  t.deepEqual(r, [
    { bid: 1, uid: 1, rid: 4, status: null, n: 3 },
    { bid: 2, uid: 1, rid: null, status: null, n: 0 },
    { bid: 3, uid: 2, rid: null, status: null, n: 0 },
    { bid: 4, uid: 2, rid: null, status: null, n: 0 },
    { bid: 5, uid: 3, rid: 2, status: null, n: 1 },
    { bid: 6, uid: 3, rid: null, status: null, n: 0 },
    { bid: 7, uid: 4, rid: null, status: null, n: 0 },
  ], 'all current books')

  /* query: find all current books by a user */
  r = db.prepare('select *, count(rid) as c from book_user where status is null and uid = ? group by bid').all(1)
  r.forEach(el => { delete el.ts })
  t.deepEqual(r, [
    { bid: 1, uid: 1, rid: 4, status: null, c: 3 },
    { bid: 2, uid: 1, rid: null, status: null, c: 0 },
  ], 'all current books by user 1')

  r = db.prepare('select *, count(rid) as c from book_user where status is null and uid = ? group by bid').all(2)
  r.forEach(el => { delete el.ts })
  t.deepEqual(r, [
    { bid: 3, uid: 2, rid: null, status: null, c: 0 },
    { bid: 4, uid: 2, rid: null, status: null, c: 0 },
  ], 'all current books by user 2')

  /* query: find all current requests by a user */
  r = db.prepare('select *, count(rid) as c from book_user where status is null and rid = ? group by bid').all(2)
  r.forEach(el => { delete el.ts })
  t.deepEqual(r, [
    { bid: 1, uid: 1, rid: 2, status: null, c: 1 },
    { bid: 5, uid: 3, rid: 2, status: null, c: 1 },
  ], 'all requests by user 2')

  /* query: find all current requests to a user */
  r = db.prepare('select * from book_user where status is null and uid = ? and rid is not null').all(1)
  r.forEach(el => { delete el.ts })
  t.deepEqual(r, [
    { bid: 1, uid: 1, rid: 2, status: null },
    { bid: 1, uid: 1, rid: 3, status: null },
    { bid: 1, uid: 1, rid: 4, status: null },
  ], 'all requests to user 1')

  t.end()
})


test('query/insert/update', t => {
  let r = db.prepare('select * from book_user').all()
  r.forEach(el => { delete el.ts })
  t.deepEqual(r, [
    { bid: 1, uid: 1, rid: 1, status: 1 },
    { bid: 2, uid: 1, rid: 1, status: 1 },
    { bid: 3, uid: 2, rid: 2, status: 1 },
    { bid: 4, uid: 2, rid: 2, status: 1 },
    { bid: 5, uid: 3, rid: 3, status: 1 },
    { bid: 6, uid: 3, rid: 3, status: 1 },
    { bid: 7, uid: 4, rid: 4, status: 1 },
    { bid: 8, uid: 4, rid: 4, status: 1 },
    { bid: 1, uid: 1, rid: 2, status: null },
    { bid: 1, uid: 1, rid: 3, status: null },
    { bid: 1, uid: 1, rid: 4, status: null },
    { bid: 3, uid: 2, rid: 5, status: null }
  ], 'Initial book_user')

  // U1 gives book1 to U2
  db.prepare(`
    update book_user
    set status = 1
    where uid = 1 and bid = 1 and rid = 2 and status is null
  `).run()

  r = db.prepare('select * from book_user').all()
  r.forEach(el => { delete el.ts })

  t.deepEqual(r, [
    { bid: 1, uid: 1, rid: 1, status: 1 },
    { bid: 2, uid: 1, rid: 1, status: 1 },
    { bid: 3, uid: 2, rid: 2, status: 1 },
    { bid: 4, uid: 2, rid: 2, status: 1 },
    { bid: 5, uid: 3, rid: 3, status: 1 },
    { bid: 6, uid: 3, rid: 3, status: 1 },
    { bid: 7, uid: 4, rid: 4, status: 1 },
    { bid: 8, uid: 4, rid: 4, status: 1 },
    { bid: 1, uid: 1, rid: 2, status: 1 },
    { bid: 1, uid: 1, rid: 3, status: 0 },
    { bid: 1, uid: 1, rid: 4, status: 0 },
    { bid: 3, uid: 2, rid: 5, status: null },
    { bid: 1, uid: 2, rid: 2, status: 1 }, // now u2 owns b2
  ], 'U1 gave B1 to U2')

  // u3, u4 asks for b1 from u2
  db.prepare('insert into book_user (bid, uid, rid) values (?, ?, ?)').run(1, 2, 3) // U3 request book1 from U2
  db.prepare('insert into book_user (bid, uid, rid) values (?, ?, ?)').run(1, 2, 4) // U4 request book1 from U2


  t.throws(function () {
    db.prepare('insert into book_user (bid, uid, rid) values (?, ?, ?)').run(1, 2, 3) // U3 request book1 from U2 again
  }, /request is in queue/, 'U3 has already requested it')

  t.throws(function () {
    db.prepare('insert into book_user (bid, uid, rid) values (?, ?, ?)').run(1, 1, 3) // U3 request book1 from U1
  }, /The book is not owned by the user/, 'U1 does not own B1')


  // u2 doesn't give b1 to anyone
  db.prepare('update book_user set status = 0 where bid = 1 and rid = 3 and status is null').run()
  r = db.prepare('select * from book_user').all()
  r.forEach(el => { delete el.ts })
  t.deepEqual(r, [
    { bid: 1, uid: 1, rid: 1, status: 1 },
    { bid: 2, uid: 1, rid: 1, status: 1 },
    { bid: 3, uid: 2, rid: 2, status: 1 },
    { bid: 4, uid: 2, rid: 2, status: 1 },
    { bid: 5, uid: 3, rid: 3, status: 1 },
    { bid: 6, uid: 3, rid: 3, status: 1 },
    { bid: 7, uid: 4, rid: 4, status: 1 },
    { bid: 8, uid: 4, rid: 4, status: 1 },
    { bid: 1, uid: 1, rid: 2, status: 1 },
    { bid: 1, uid: 1, rid: 3, status: 0 },
    { bid: 1, uid: 1, rid: 4, status: 0 },
    { bid: 3, uid: 2, rid: 5, status: null },
    { bid: 1, uid: 2, rid: 2, status: 1 },
    { bid: 1, uid: 2, rid: 3, status: 0 },
    { bid: 1, uid: 2, rid: 4, status: 0 }
  ], 'U2 does not give B1 to anyone')

  // delete B8
  db.prepare('insert into book_user (bid) values(?)').run(8)

  // all current active books
  r = db.prepare(`
    select * from active_book
  `).all()

  r.forEach(el => { delete el.ts; delete el.rowid })
  t.deepEqual(r, [
    { bid: 1, uid: 2, rid: 2, status: 1 },
    { bid: 2, uid: 1, rid: 1, status: 1 },
    { bid: 3, uid: 2, rid: 2, status: 1 },
    { bid: 4, uid: 2, rid: 2, status: 1 },
    { bid: 5, uid: 3, rid: 3, status: 1 },
    { bid: 6, uid: 3, rid: 3, status: 1 },
    { bid: 7, uid: 4, rid: 4, status: 1 }
  ], 'All current active books')


  /* query: find all current books by a user */
  r = db.prepare(`
    select * from active_book where uid = ?
  `).all(2)
  r.forEach(el => { delete el.ts; delete el.rowid })
  t.deepEqual(r, [
    { bid: 1, uid: 2, rid: 2, status: 1 },
    { bid: 3, uid: 2, rid: 2, status: 1 },
    { bid: 4, uid: 2, rid: 2, status: 1 }
  ], 'find all current books owned by U2')

  /* query: find all requests to a book */
  r = db.prepare(`
    select * from book_user
      where bid = $bid
      and uid != rid
      and uid = $uid
      order by rowid
  `).all({ bid: 1, uid: 2 })
  r.forEach(el => { delete el.ts; delete el.rowid })
  t.deepEqual(r, [
    { bid: 1, uid: 2, rid: 3, status: 0 },
    { bid: 1, uid: 2, rid: 4, status: 0 }
  ], 'all requests to B1')

  /* query: find all requests to a user */
  r = db.prepare(`
    select * from book_user
      where uid = $uid and uid != rid
      and bid in (select bid from active_book where uid = $uid)
  `).all({ uid: 2 })
  r.forEach(el => { delete el.ts; delete el.rowid })
  t.deepEqual(r, [
    { bid: 3, uid: 2, rid: 5, status: null },
    { bid: 1, uid: 2, rid: 3, status: 0 },
    { bid: 1, uid: 2, rid: 4, status: 0 }
  ], 'all requests to U2')

  t.end()
})
