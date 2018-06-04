import db from '../sqlite'

db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(1, 'e1', 'p')
db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(2, 'e2', 'p')
db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(3, 'e3', 'p')
db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(4, 'e4', 'p')
db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(5, 'e5', 'p')
db.prepare('insert into "user" (id, email, pw) values (?, ?, ?)').run(6, 'e6', 'p')


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


db.prepare('insert into book_user (bid, uid) values (?, ?)').run(1, 1)
db.prepare('insert into book_user (bid, uid) values (?, ?)').run(2, 1)
db.prepare('insert into book_user (bid, uid) values (?, ?)').run(3, 2)
db.prepare('insert into book_user (bid, uid) values (?, ?)').run(4, 2)
db.prepare('insert into book_user (bid, uid) values (?, ?)').run(5, 3)
db.prepare('insert into book_user (bid, uid) values (?, ?)').run(6, 3)
db.prepare('insert into book_user (bid, uid) values (?, ?)').run(7, 4)
db.prepare('insert into book_user (bid, uid) values (?, ?)').run(8, 4)

let t = ~~(Date.now() / 1000)

t += 10
db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, t, 2)
db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, t, 3)
db.prepare('insert into book_user (bid, uid, ts, rid) values (?, ?, ?, ?)').run(1, 1, t, 4)


t += 10
db.prepare('update book_user set status = 1 where rowid = (select rowid from book_user where bid = ? and uid = ? and rid = ? order by ts desc limit 1)').run(1, 1, 2)

t += 10
db.prepare('insert into book_user (bid, uid, ts, rid, status) values (?, ?, ?, ?, ?)').run(1, 1, t, 2, 2)
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


console.log(db.prepare('select * from book_user').all())
// console.log(db.prepare('select *, uid over (partition by bid) from book_user').all())
// console.log(db.prepare('select *, min(rowid) as m from book_user group by bid').all())
// console.log(db.prepare(`
//   select t1.bid as b1, t1.uid as u1, t1.rid as r1, t1.status as s1, t2.bid as b2, t2.uid as u2, t2.rid as r2, t2.status as s2
//     from book_user t1
//     left join book_user t2
//     on (t1.bid = t2.bid and t1.rid < t2.rid)
//   --where t2.rid is null
// `).all())

console.log(db.prepare(`
  select t1.*
    from book_user t1
    left join book_user t2
    on (t1.bid = t2.bid)
  --where t2.rid is null
`).all())
