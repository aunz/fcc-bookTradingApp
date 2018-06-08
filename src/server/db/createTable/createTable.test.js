import test from 'tape'
import db from '../sqlite'
import './createTable'

const s = { skip: true } // eslint-disable-line

test('init', s, t => {
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
  db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, n, 2)
  db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, n, 3)
  db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, n, 4)
  // db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, n, 4)
  // db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, n, 4)
  // db.prepare('insert into book_user (bid, uid) values (?, ?)').run(1, 1)
  // db.prepare('insert into book_user (bid, uid, ts, rid, status) values (?, ?, ?, ?, ?)').run(1, 1, n, 4, 1)
  db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(5, 3, n, 2)

  // db.prepare('insert into book_user (bid, uid, ts) values (?, ?, ?)').run(1, 1, n + 10)
  // db.prepare('insert into book_user (bid) values (?)').run(1)

  // a book is deleted
  // db.prepare('insert into book_user (bid) values (?)').run(8)

  t.end()
})

test('query', s, t => {
  let r = db.prepare('select *, count(rid) as n from book_user where status is null group by bid having uid is not null').all()
  r.forEach(el => { delete el.ts })
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


test('insert', s, t => {
  // db.prepare('update book_user set status = 1 where status is null and bid == 1 and uid == 1 and rid == 2').run()
  console.log(db.prepare('select * from book_user').all())

  console.log(db.prepare(`
    with cte as (select * from book_user where bid == 1 and status is null order by rowid desc)
    select * from cte
  `).all())

  t.end()
})
/* query: find all current books */


// db.prepare('update book_user set status = 1 where rowid = (select rowid from book_user where bid = ? and uid = ? and rid = ? order by ts desc limit 1)').run(1, 1, 2)


// db.prepare('insert into book_user (bid, uid, ts, rid, status) values (?, ?, ?, ?, ?)').run(1, 1, t, 2, 2)
// db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, t, 2)

// db.prepare('update book_user set status = 1 where bid = ? and uid = ? and rid = ? ').run(1, 1, 2)

// console.log(db.prepare('select *, rowid from book_user where bid = ? and uid = ? and rid = ?').all(1, 1, 2))
// console.log(db.prepare('select *, max(rowid) from book_user where bid = ? and uid = ? and rid = ?').all(1, 1, 2))


// console.log(db.prepare(`
//   with cte as (select rowid from book_user where bid = ? and uid = ? and rid = ? order by ts desc limit 1)
//   update book_user set status = 1 where rowid = (select rowid from cte)
//   -- select * from cte
// `).run(1, 1, 2))
// `).all(1, 1, 2))


// console.log(db.prepare('select * from book_user').all())
// console.log(db.prepare('select *, max(rowid) as m from book_user group by bid').all())

test(t => {
  console.log(db.prepare(`
    select * from t
  `).all())


  console.log(db.prepare(`
    with cte0 as (
      select item from t order by id desc limit 1
    ), cte as (
      select t.*, t.rowid from t, cte0 where t.item = cte0.item order by id desc
    ),
    cte2 as (
      select rowid as n from (select * from cte limit 1)
      union 
      select cte.rowid from cte, cte2 where cte.rowid = cte2.n - 1
    )
    select * from t where rowid in (select n from cte2)
  `).all())
  t.end()
})
