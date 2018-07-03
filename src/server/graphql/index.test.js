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
