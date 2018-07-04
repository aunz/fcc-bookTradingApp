import test from 'tape'
import { graphql } from 'graphql'


import { schema } from './index'
import db from '~/server/db/sqlite'

db.exec(require('~/server/db/createTable/createTable.sql'))


// graphql(schema, query)

const s = { skip: true } // eslint-disable-line

test('Init data', async t => {
  const { data: u } = await graphql(schema, `mutation {
    u1: signup(name: "U1", email: "USER.01@gmail.com", city: "C1", pw: "1234") { id, name, email, city, token }
    u2: signup(name: "U2", email: "U2@test.com", city: "C2", pw: "1234") { id, name, email, city, token }
    u3: signup(name: "U3", email: "u3@test.com", city: "C3", pw: "1234") { id, name, email, city, token }
  }`)

  const { u1, u2, u3 } = u
  t.ok(h(u1) && h(u2) && h(u2), 'new user has id and token')
  t.ok(
    h2(u1, 'U1', 'user01@gmail.com', 'C1') &&
    h2(u2, 'U2', 'u2@test.com', 'C2') &&
    h2(u3, 'U3', 'u3@test.com', 'C3'),
    'users also have name, email, city'
  )
  t.ok(u1.pw === undefined, 'no pw should be returned')

  const { data: b } = await graphql(schema, `mutation {
    b1: addBook(token: "${u1.token}", gid: "b01") { bid, uid, rid, status, ts }
    b2: addBook(token: "${u1.token}", gid: "b02") { bid, uid, rid, status, ts }
    b3: addBook(token: "${u2.token}", gid: "b03") { bid, uid, rid, status, ts }
    b4: addBook(token: "${u2.token}", gid: "b04") { bid, uid, rid, status, ts }
    b5: addBook(token: "${u3.token}", gid: "b05") { bid, uid, rid, status, ts }
    b6: addBook(token: "${u3.token}", gid: "b06") { bid, uid, rid, status, ts }
  }`)
  t.ok(
    h3(b.b1, u1.id) &&
    h3(b.b2, u1.id) &&
    h3(b.b3, u2.id) &&
    h3(b.b4, u2.id) &&
    h3(b.b5, u3.id) &&
    h3(b.b6, u3.id),
    'can create books'
  )

  t.end()
})

test('User', s, async t => {
  let r = await graphql(schema, `mutation {
    u4: signup(name: "U4", email: "u.s.e.r.01@gmail.com", city: "C1", pw: "1234") { id, name, email, city, token }
  }`)

  t.ok(/UNIQUE.*email/i.test(r.errors[0].message), 'cannot create a user with an email already registered')

  r = await graphql(schema, `mutation {
    u4: signup(name: "U4", email: "u.s.e.r.02@gmail.com", city: "C1" ) { id, name, email, city, token }
  }`)
  t.ok(/pw/i.test(r.errors[0].message), 'pw is required')

  r = await graphql(schema, `mutation {
    u4: signup(name: "U4", email: "u.s.e.r.02@gmail.com", city: "C1", pw: 123 ) { id, name, email, city, token }
  }`)
  t.ok(/expected.*string.*123/i.test(r.errors[0].message), 'pw has to be a string')

  r = await graphql(schema, `mutation {
    u4: signup(name: "U4", email: "u.s.e.r.02@gmail.com", city: "C1", pw: "12" ) { id, name, email, city, token }
  }`)
  t.ok(/invalid.*input.*password/i.test(r.errors[0].message), 'pw length too short')

  r = await graphql(schema, `mutation {
    u4: signup(name: "U4", email: "e@e", city: "C1", pw: "123456" ) { id, name, email, city, token }
  }`)
  t.ok(/invalid.*input.*email/i.test(r.errors[0].message), 'email is required')

  {
    const { data: u1 } = await graphql(schema, `mutation {
      login(email: "u.ser01@gmail.com", pw: "1234") { id, name, email, city, token }
    }`)
    t.ok(h(u1.login) && h2(u1.login, 'U1', 'user01@gmail.com', 'C1'), 'can login')


    r = await graphql(schema, `mutation {
      c1: changeDetail(token: "${u1.login.token}", key: name, value: "New Name")
      c2: changeDetail(token: "${u1.login.token}", key: city, value: "New City")
    }`)
    t.deepEqual(r, { data: { c1: 1, c2: 1 } }, 'logged in user can change name and city')

    r = await graphql(schema, `mutation {
      c1: changeDetail(token: "${u1.login.token}", key: Name, value: "New Name")
    }`)
    t.ok(/expected.*type/i.test(r.errors[0].message), 'changeDetail has to be either name or city')

    r = await graphql(schema, `mutation {
      c1: changeDetail(token: "123", key: name, value: "new name")
    }`)
    t.ok(/unauthorized/i.test(r.errors[0].message), 'need to login to change detail')

    r = await graphql(schema, `mutation {
      login(email: "u.ser01@gmail.com", pw: "1234") { id, name, email, city, token }
    }`)
    t.ok(r.data.login.name === 'New Name' && r.data.login.city === 'New City', 'user detail has been changed')

    r = await graphql(schema, 'mutation { c1: logout(token: "111") }')
    t.deepEqual(r, { data: { c1: null } }, 'log out with the wrong token')
    r = db.prepare('select * from "user" where email = ?').get('user01@gmail.com')
    t.ok(Buffer.isBuffer(r.token) && r.token_ts > (Date.now() / 1000) - 10, 'with no change in db')

    r = await graphql(schema, 'mutation { login(email: "u.ser01@gmail.com", pw: "1234") { token } }')
    r = await graphql(schema, `mutation { logout(token: "${r.data.login.token}") }`)
    t.deepEqual(r, { data: { logout: 1 } }, 'log out with the correct token')
    r = db.prepare('select * from "user" where email = ?').get('user01@gmail.com')
    t.ok(r.token === null && r.token_ts === null && r.token_ts_exp === null, 'token and token_ts is clear')
  }


  r = null

  t.end()
})

test('Book', s, async t => {
  let { data: { getGBooks: r } } = await graphql(schema, `query {
    getGBooks { id, gid }
  }`)
  t.ok(
    r.length === 6 &&
    r.map(el => el.gid).join('') === 'b06b05b04b03b02b01',
    'has the correct books'
  )

  r = (await graphql(schema, `query {
    getBooks { bid, uid, rid, status, ts }
  }`)).data.getBooks
  t.ok(
    r.length === 6 &&
    r.map(el => el.status).join('') === '111111',
    'has the correct books from active_book'
  )

  t.deepEqual(
    (await graphql(schema, `query {
    getBook(bid: ${r[0].bid}) { bid, uid, rid, status, ts }
    }`)).data.getBook,
    r[0],
    'can get a single book'
  )

  const u = (await graphql(schema, `mutation {
    login(email: "u.s.er01@gmail.com", pw: "1234") { id, name, email, city, token }
  }`)).data.login

  r = (await graphql(schema, `query {
    getBooks(uid: ${u.id}) { bid, uid, rid, status, ts }
  }`)).data.getBooks

  t.ok(
    r.length === 2 &&
    r[0].uid === u.id &&
    r[1].uid === u.id,
    'can get books by user id'
  )

  r = null
  t.end()
})

test('Trade', async t => {
  const { data: { u1, u2, u3 } } = await graphql(schema, `mutation {
    u1: login(email: "u.s.er01@gmail.com", pw: "1234") { id, name, email, city, token }
    u2: login(email: "u2@test.com", pw: "1234") { id, name, email, city, token }
    u3: login(email: "u3@test.com", pw: "1234") { id, name, email, city, token }
  }`)

  const b = (await graphql(schema, `query {
    getBooks { bid, uid, rid, status, ts }
  }`)).data.getBooks.reverse()

  // u2 requests b0 from u1, u3 request b0, 1, 2
  let r = await graphql(schema, `mutation {
    t1: tradeBook(token: "${u2.token}", type: request, bid: ${b[0].bid})
    t2: tradeBook(token: "${u3.token}", type: request, bid: ${b[0].bid})
    t3: tradeBook(token: "${u3.token}", type: request, bid: ${b[1].bid})
    t4: tradeBook(token: "${u3.token}", type: request, bid: ${b[2].bid})
  }`)
  t.deepEqual(r, { data: { t1: 1, t2: 1, t3: 1, t4: 1 } }, 'can request books')

  r = (await graphql(schema, `query {
    r1: getReqsByBook(bid: ${b[0].bid}) { bid, uid, rid, status }
    r2: getReqsByBook(bid: ${b[1].bid}) { bid, uid, rid, status }
    r3: getReqsByBook(bid: ${b[2].bid}) { bid, uid, rid, status }
    r4: getReqsByBook(bid: ${b[3].bid}) { bid, uid, rid, status }
  }`)).data
  t.ok(
    r.r1.length === 2 && r.r2.length === 1 && r.r3.length === 1 && r.r4.length === 0 &&
    r.r1[0].bid === b[0].bid && r.r1[0].uid === u1.id && r.r1[0].rid === u3.id && r.r1[0].status === null &&
    r.r1[1].bid === b[0].bid && r.r1[1].uid === u1.id && r.r1[1].rid === u2.id && r.r1[1].status === null &&
    r.r2[0].bid === b[1].bid && r.r2[0].uid === u1.id && r.r2[0].rid === u3.id && r.r2[0].status === null &&
    r.r3[0].bid === b[2].bid && r.r3[0].uid === u2.id && r.r3[0].rid === u3.id && r.r3[0].status === null,
    'get reqs by book'
  )

  r = (await graphql(schema, `query {
    r1: getReqsByUser(rid: ${u1.id}) { bid, uid, rid, status }
    r2: getReqsByUser(rid: ${u2.id}) { bid, uid, rid, status }
    r3: getReqsByUser(rid: ${u3.id}) { bid, uid, rid, status }
  }`)).data
  t.ok(
    r.r1.length === 3 && r.r2.length === 1 && r.r3.length === 0 &&
    r.r1[0].bid === b[1].bid && r.r1[0].uid === u1.id && r.r1[0].rid === u3.id && r.r1[0].status === null &&
    r.r1[1].bid === b[0].bid && r.r1[1].uid === u1.id && r.r1[1].rid === u3.id && r.r1[1].status === null &&
    r.r1[2].bid === b[0].bid && r.r1[2].uid === u1.id && r.r1[2].rid === u2.id && r.r1[2].status === null &&
    r.r2[0].bid === b[2].bid && r.r2[0].uid === u2.id && r.r2[0].rid === u3.id && r.r2[0].status === null,
    'get reqs by user'
  )

  r = (await graphql(schema, `query {
    r1: getUserReqs(uid: ${u1.id}) { bid, uid, rid, status }
    r2: getUserReqs(uid: ${u2.id}) { bid, uid, rid, status }
    r3: getUserReqs(uid: ${u3.id}) { bid, uid, rid, status }
  }`)).data
  t.ok(
    r.r1.length === 0 && r.r2.length === 1 && r.r3.length === 3 &&
    r.r2[0].bid === b[0].bid && r.r2[0].uid === u1.id && r.r2[0].rid === u2.id && r.r2[0].status === null &&
    r.r3[0].bid === b[2].bid && r.r3[0].uid === u2.id && r.r3[0].rid === u3.id && r.r3[0].status === null &&
    r.r3[1].bid === b[1].bid && r.r3[1].uid === u1.id && r.r3[1].rid === u3.id && r.r3[1].status === null &&
    r.r3[2].bid === b[0].bid && r.r3[2].uid === u1.id && r.r3[2].rid === u3.id && r.r3[2].status === null,
    'get user reqs'
  )

  // trade
  r = (await graphql(schema, `mutation {
    r1: tradeBook(token: "${u1.token}", type: accept, bid: ${b[0].bid}, rid: ${u2.id}) # OK, u1 accept b0 trade for u2
    r2: tradeBook(token: "${u1.token}", type: accept, bid: ${b[2].bid}, rid: ${u2.id}) # no, u1 does not own b2
    r3: tradeBook(token: "${u2.token}", type: accept, bid: ${b[2].bid}, rid: ${u1.id}) # no, u1 does not ask for b2
    r4: tradeBook(token: "${u3.token}", type: decline, bid: ${b[3].bid}, rid: ${u1.id}) # no, u3 does not have any request
    r5: tradeBook(token: "${u2.token}", type: decline, bid: ${b[2].bid}, rid: ${u1.id}) # no, u1 does not ask for b2
    r6: tradeBook(token: "${u2.token}", type: decline, bid: ${b[2].bid}, rid: ${u3.id}) # ok, u2 decline b2 trade for u3
  }`))
  t.deepEqual(r, { data: { r1: 1, r2: 0, r3: 0, r4: 0, r5: 0, r6: 1 } }, 'can accept and decline books')

  r = (await graphql(schema, `query {
    r1: getReqsByBook(bid: ${b[0].bid}) { bid, uid, rid, status }
    r2: getReqsByBook(bid: ${b[1].bid}) { bid, uid, rid, status }
    r3: getReqsByBook(bid: ${b[2].bid}) { bid, uid, rid, status }
    r4: getReqsByBook(bid: ${b[3].bid}) { bid, uid, rid, status }
  }`)).data
  t.ok(
    r.r1.length === 0 && r.r2.length === 1 && r.r3.length === 0 && r.r4.length === 0 &&
    r.r2[0].bid === b[1].bid && r.r2[0].uid === u1.id && r.r2[0].rid === u3.id && r.r2[0].status === null,
    'get reqs by book after trading'
  )

  r = (await graphql(schema, `query {
    r1: getReqsByUser(rid: ${u1.id}) { bid, uid, rid, status }
    r2: getReqsByUser(rid: ${u2.id}) { bid, uid, rid, status }
    r3: getReqsByUser(rid: ${u3.id}) { bid, uid, rid, status }
  }`)).data
  t.ok(
    r.r1.length === 1 && r.r2.length === 0 && r.r3.length === 0 &&
    r.r1[0].bid === b[1].bid && r.r1[0].uid === u1.id && r.r1[0].rid === u3.id && r.r1[0].status === null,
    'get reqs by user after trading'
  )

  r = (await graphql(schema, `query {
    r1: getUserReqs(uid: ${u1.id}) { bid, uid, rid, status }
    r2: getUserReqs(uid: ${u2.id}) { bid, uid, rid, status }
    r3: getUserReqs(uid: ${u3.id}) { bid, uid, rid, status }
  }`)).data
  t.ok(
    r.r1.length === 0 && r.r2.length === 0 && r.r3.length === 1 &&
    r.r3[0].bid === b[1].bid && r.r3[0].uid === u1.id && r.r3[0].rid === u3.id && r.r3[0].status === null,
    'get user reqs after trading'
  )

  r = (await graphql(schema, `query {
    r1: getReqsByBook(bid: ${b[0].bid}, all: true) { bid, uid, rid, status }
  }`)).data.r1.reverse()
  t.ok(
    r.length === 4 &&
    r.every(el => el.bid === b[0].bid) &&
    r[0].uid === u1.id && r[1].uid === u1.id && r[2].uid === u1.id && r[3].uid === u2.id &&
    r[0].rid === u1.id && r[1].rid === u2.id && r[2].rid === u3.id && r[3].rid === u2.id &&
    r.map(el => el.status).join('') === '1101',
    'b0 had 4 requests'
  )

  r = (await graphql(schema, `query {
    r1: getReqsByUser(rid: ${u1.id}, all: true) { bid, uid, rid, status }
  }`)).data.r1.reverse()
  t.ok(
    r.length === 5 &&
    r[0].bid === b[0].bid && r[1].bid === b[1].bid && r[2].bid === b[0].bid && r[3].bid === b[0].bid && r[4].bid === b[1].bid &&
    r.every(el => el.uid === u1.id) &&
    r[0].rid === u1.id && r[1].rid === u1.id && r[2].rid === u2.id && r[3].rid === u3.id && r[4].rid === u3.id &&
    r.map(el => el.status).join('') === '1110',
    '5 trans towards u1'
  )

  r = (await graphql(schema, `query {
    r1: getUserReqs(uid: ${u3.id}, all: true) { bid, uid, rid, status }
  }`)).data.r1.reverse()
  t.ok(
    r.length === 5 &&
    r[0].bid === b[4].bid && r[1].bid === b[5].bid && r[2].bid === b[0].bid && r[3].bid === b[1].bid && r[4].bid === b[2].bid &&
    r[0].uid === u3.id && r[1].uid === u3.id && r[2].uid === u1.id && r[3].uid === u1.id && r[4].uid === u2.id &&
    r.every(el => el.rid === u3.id) &&
    r.map(el => el.status).join('') === '1100',
    'u3 had 5 trans'
  )

  // del a book
  r = (await graphql(schema, `mutation {
    r1: delBook(token: "${u1.token}", bid: ${b[0].bid})
    r2: delBook(token: "${u1.token}", bid: ${b[1].bid})
    r3: delBook(token: "${u1.token}", bid: ${b[2].bid})
  }`))
  t.deepEqual(r, { data: { r1: 0, r2: 1, r3: 0 } }, 'can delete a book with the right owner')

  r = (await graphql(schema, `mutation {
    r1: delBook(token: "123", bid: ${b[3].bid})
  }`))
  t.ok(/unauthorized/i.test(r.errors[0].message), 'del needs authorization')

  r = (await graphql(schema, `query {
    getBooks { bid, uid, rid, status, ts }
  }`)).data.getBooks
  t.ok(
    r.length === 5 && r.every(el => el.bid !== b[1].bid),
    'after del, no more b1'
  )
  r = (await graphql(schema, `query {
    r1: getBook(bid: ${b[0].bid}) { bid, uid, rid, status, ts }
    r2: getBook(bid: ${b[1].bid}) { bid, uid, rid, status, ts }
  }`)).data
  t.ok(
    r.r1.uid === u2.id && r.r1.rid === u2.id && r.r1.status === 1 && r.r2 === null,
    'b1 is no longer in the active_book'
  )

  r = (await graphql(schema, `query {
    r1: getReqsByBook(bid: ${b[0].bid}) { bid, uid, rid, status }
    r2: getReqsByBook(bid: ${b[1].bid}) { bid, uid, rid, status }
    r3: getReqsByBook(bid: ${b[2].bid}) { bid, uid, rid, status }
    r4: getReqsByBook(bid: ${b[3].bid}) { bid, uid, rid, status }
  }`)).data
  t.deepEqual(r, { r1: [], r2: [], r3: [], r4: [] }, 'no more book requests')

  r = (await graphql(schema, `query {
    r1: getUserReqs(uid: ${u1.id}) { bid, uid, rid, status }
    r2: getUserReqs(uid: ${u1.id}, all: true) { bid, uid, rid, status }
    r3: getUserReqs(uid: ${u3.id}) { bid, uid, rid, status }
    r4: getUserReqs(uid: ${u3.id}, all: true) { bid, uid, rid, status }
  }`)).data
  t.ok(
    r.r1.length === 0 && r.r2.length === 2 && r.r3.length === 0 && r.r4.length === 5 &&
    r.r2[0].bid === b[1].bid && r.r2[1].bid === b[0].bid,
    'user req after del'
  )

  r = (await graphql(schema, `query {
    r1: getReqsByUser(rid: ${u1.id}) { bid, uid, rid, status }
    r2: getReqsByUser(rid: ${u1.id}, all: true) { bid, uid, rid, status }
    r3: getReqsByUser(rid: ${u2.id}) { bid, uid, rid, status }
    r4: getReqsByUser(rid: ${u2.id}, all: true) { bid, uid, rid, status }
    r5: getReqsByUser(rid: ${u3.id}) { bid, uid, rid, status }
    r6: getReqsByUser(rid: ${u3.id}, all: true) { bid, uid, rid, status }
  }`)).data
  t.ok(
    r.r1.length === 0 && r.r2.length === 5 &&
    r.r3.length === 0 && r.r4.length === 4 &&
    r.r5.length === 0 && r.r6.length === 2 &&
    true,
    'reqs by user after del'
  )

  r = null
  t.end()
})

// helper fn
function h(x, max = 10050) {
  return x.id >= 10000 && x.id <= max && x.token.length === 28
}
function h2(x, name, email, city) {
  return x.name === name && x.email === email && x.city === city
}
function h3(x, uid, max = 10200) {
  return x.bid >= 10000 && x.bid <= max && x.status === 1 && x.uid === x.rid && x.uid === uid
}
