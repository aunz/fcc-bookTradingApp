import ApolloClient from 'apollo-boost'
import { createHttpLink } from 'apollo-link-http'
import { withClientState } from 'apollo-link-state'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { ApolloLink } from 'apollo-link'
import { RestLink } from 'apollo-link-rest'
import gql from 'graphql-tag'

import { get, set, del } from 'idb-keyval'


const typeDefs = `
  type User {
    id: Int!
    name: String
    email: String!
    loc: String
    token: String!
  }
  type BookUser {
    gid: String!
    bid: Int!
    uid: Int
    rid: Int
    status: Int
    ts: Int
  }
  type Query {
    localUser: User
    getBooks(uid: Int) [BookUser]!
  }
  type Mutation {
    updateLocalUser(id: Int!, name: String, email: String, loc: String, token: String, logout: Bool): Bool
  }
`

const Query = {
  localUser() {
    return get('user').then(r => {
      if (!r) return null
      return client.mutate({ mutation: LOGIN_WITH_TOKEN, variables: { token: r.token } })
        .then(({ data }) => {
          const user = data.loginWithToken
          if (!user) return null
          user.token = r.token
          return user
        }).catch(console.error)
    }).catch(() => null)
  },
  getBooks() {
    return client.query({
      query: gql`query getBooks($uid: Int) {
        getGBooks { id, gid }
        getBooks(uid: $uid) { bid, uid, rid, status, ts }
      }`,
      variables: { uid: client.readQuery({ query: LOCAL_USER }).localUser.uid },
      fetchPolicy: 'no-cache',
    }).then(({ data: { getGBooks, getBooks } }) => {
      return getBooks.map(book => {
        return {
          ...book,
          gid: getGBooks.find(gBook => gBook.id === book.bid).gid
        }
      })
    })
  },
}

const Mutation = {
  updateLocalUser(_, args, { cache }) {
    if (args.logout) {
      client.mutate({
        mutation: gql`mutation logout($token: String!) { logout(token: $token) }`,
        variables: { token: args.token }
      })
      return del('user').catch(() => {}).then(() => null)
    }
    args.__typename = 'User'
    return set('user', args)
      .catch(() => {})
      .then(() => {
        cache.writeQuery({
          query: LOCAL_USER,
          data: { localUser: args }
        })
        return null // otherwise it shows this warning: Missing field updateLocalUser in {}
      })
  }
}

const cache = new InMemoryCache()
const stateLink = withClientState({ cache, resolvers: { Query, Mutation }, typeDefs })

const restLink = new RestLink({
  uri: 'https://www.googleapis.com/books/v1/volumes',
})

const link = ApolloLink.from([stateLink, restLink, createHttpLink()])

const client = new ApolloClient({
  clientState: {
    typeDefs,
  },
  link
})

export default client

export const SIGNUP = gql`mutation signup($name: String!, $email: String!, $loc: String, $pw: String!) {
  signup(name: $name, email: $email, loc: $loc, pw: $pw) @connection(key: "noCache") {
    id
    name
    email
    loc
    token
  }
}`

export const LOGIN = gql`mutation login($email: String!, $pw: String!) {
  login(email: $email, pw: $pw) @connection(key: "noCache") {
    id
    name
    email
    loc
    token 
  }
}
`

export const LOGIN_WITH_TOKEN = gql`mutation loginWithToken($token: String!) {
  loginWithToken(token: $token) @connection(key: "noCache") {
    id
    name
    email
    loc
  }
}
`

export const LOCAL_USER = gql`query { localUser @client { id, name, email, loc, token } }`
export const UPDATE_LOCAL_USER = gql`mutation updateLocalUser($id: Int, $name: String, $email: String, $loc: String, $token: String, $logout: Bool) {
  updateLocalUser(id: $id, name: $name, email: $email, loc: $loc, token: $token, logout: $logout) @client @connection(key: "noCache")
}`
export const UPDATE_DETAIL = gql`mutation updateDetail($token: String!, $key: UserDetail!, $value: String!) {
  updateDetail(token: $token, key: $key, value: $value) @connection(key: "noCache")
}
`
export const ADD_BOOK = gql`mutation addBook($token: String!, $gid: String!) {
  addBook(token: $token, gid: $gid) @connection(key: "noCache") {
    bid
    uid
    rid
    status
    ts
  }
}
`


export const GET_GBOOKS = gql`query getGBooks { id, gid }`
export const GET_BOOKS = gql`query getBooks {
  getBooks @client { gid, bid, uid, rid, status, ts }
}`

export const SEARCH_GOOGLE = gql`query search($q: String!) {
  search(q: $q, maxResults: 40) @rest(type: "GBook", path: "/") {
    id
  }
}
`
