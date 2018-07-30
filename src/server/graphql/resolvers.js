import isEmail from 'validator/lib/isEmail'
import normalizeEmail from 'validator/lib/normalizeEmail'

import {
  createUser, getUserWithPW, getUserWithId,
  updateUser, getAndUpdateUserFromToken,
  addBook, requestBook, actBook, delBook,
  getGBooks, getBooks, getBook, getReqsByUser, getUserReqs, getReqsByBook,
} from '~/server/db/dbFunctions'

import { errInput, errAuth } from '~/server/errors'

const { GG_BOOK_API } = process.env

export default {
  Query: {
    getGBooks() { return getGBooks() },
    getBooks(_, { uid }) { return getBooks(uid) },
    getBook(_, { bid }) { return getBook(bid) },
    getReqsByBook(_, { bid, all }) { return getReqsByBook(bid, all) },
    getReqsByUser(_, { rid, all }) { return getReqsByUser(rid, all) }, // all requests created by this user
    getUserReqs(_, { uid, all }) { return getUserReqs(uid, all) }, // all requests towards this user
    getGGAPI() { return GG_BOOK_API },
    getUserDetail(_, { id }) { return getUserWithId(id) }
  },
  Mutation: {
    signup(_, { name = '', email, loc = '', pw }) {
      if (!isEmail(email)) throw errInput('Email is invalid')
      if (pw.length < 3) throw errInput('Password too short')
      email = normalizeEmail(email)
      return createUser({ name, email, loc, pw }).then(() => getUserWithPW(email, pw)).catch(e => {
        if (/UNIQUE.*email/i.test(e.message)) throw errInput('The provided email has been registered')
      })
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
      const book = getBook(bid)
      if (book.uid !== uid) throw errAuth('You are not the owner of the book ' + bid)
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
    loginWithToken(_, { token }) {
      return getAndUpdateUserFromToken(token)
    },
    logout(_, { token }) {
      const uid = authUser(token)
      try {
        return updateUser(uid, { token: null })
      } catch (e) {  // eslint-disable-line
        return null
      }
    },
    updateDetail(_, { token, key, value }) {
      if (!token || !key || !value) throw errInput()
      if (!['name', 'loc', 'email'].includes(key)) throw errInput() // can only update name, loc, email
      if (key === 'email') {
        if (!isEmail(value)) throw errInput('Email is invalid')
        value = normalizeEmail(value)
      }
      const uid = authUser(token)
      try {
        return updateUser(uid, { [key]: value })
      } catch (e) {  // eslint-disable-line
        if (/UNIQUE.*email/i.test(e.message)) throw errInput('The provided email has been registered')
        throw e
      }
    },
  },
}

function authUser(token) {
  if (!token) throw errAuth()
  const user = getAndUpdateUserFromToken(token)
  if (!user) throw errAuth()
  return user.id
}

