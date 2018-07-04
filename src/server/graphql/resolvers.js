import isEmail from 'validator/lib/isEmail'
import normalizeEmail from 'validator/lib/normalizeEmail'

import {
  createUser, getUserWithPW, updateUser, getAndUpdateUserFromToken,
  addBook, requestBook, actBook, delBook,
  getGBooks, getBooks, getBook, getReqsByUser, getUserReqs, getReqsByBook,
} from '~/server/db/dbFunctions'

import { errInput, errAuth } from '~/server/errors'

export default {
  Query: {
    getGBooks() { return getGBooks() },
    getBooks(_, { uid }) { return getBooks(uid) },
    getBook(_, { bid }) { return getBook(bid) },
    getReqsByBook(_, { bid, all }) { return getReqsByBook(bid, all) },
    getReqsByUser(_, { rid, all }) { return getReqsByUser(rid, all) }, // all requests created by this user
    getUserReqs(_, { uid, all }) { return getUserReqs(uid, all) }, // all requests towards this user
  },
  Mutation: {
    signup(_, { name = '', email, city = '', pw }) {
      if (!isEmail(email)) throw errInput('No email is provided')
      if (pw.length < 3) throw errInput('Password too short')
      email = normalizeEmail(email)
      return createUser({ name, email, city, pw }).then(() => getUserWithPW(email, pw))
    },
    addBook(_, { token, gid }) {
      if (!gid) throw errInput('Need book id')
      const uid = authUser(token)
      return addBook(gid, uid)
    },
    delBook(_, { token, bid }) {
      if (!bid) throw errInput('Need book id')
      const uid = authUser(token)
      return delBook(bid, uid)
    },
    tradeBook(_, { token, type, bid, rid }) {
      const uid = authUser(token)
      if (type === 'request') return requestBook(bid, uid)
      if (!rid) throw errInput('rid is required')
      if (type === 'accept') return actBook(bid, rid, 1)
      if (type === 'decline') return actBook(bid, rid, 0)
      throw errInput('wrong trade type')
    },
    async login(_, { email, pw }) {
      if (!pw || !isEmail(email)) throw errInput()
      const user = await getUserWithPW(normalizeEmail(email), pw)
      if (!user) throw errAuth()
      return user
    },
    logout(_, { token }) {
      try {
        const uid = authUser(token)
        return updateUser(uid, { token: null })
      } catch (e) {  // eslint-disable-line
        return null
      }
    },
    changeDetail(_, { token, key, value }) {
      if (!token || !key || !value) throw errInput()
      if (!['name', 'city'].includes(key)) throw errInput() // can only update name and city
      const uid = authUser(token)
      return updateUser(uid, { [key]: value })
    },
  },
}

function authUser(token) {
  if (!token) throw errAuth()
  const user = getAndUpdateUserFromToken(token)
  if (!user) throw errAuth()
  return user.id
}

