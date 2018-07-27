import ApolloClient, { gql } from 'apollo-boost'
// import { RestLink } from 'apollo-link-rest'
// import { InMemoryCache } from 'apollo-cache-inmemory'

import { get, set, del } from 'idb-keyval'


const client = new ApolloClient({
  defaults: {
    getBooks: []
  },
  clientState: {
    typeDefs: `
      type User {
        id: Int!
        name: String
        email: String!
        loc: String
        token: String!
      }
      type BookUser {
        id: Int!
        gid: String!
        bid: Int!
        uid: Int
        rid: Int
        status: Int
        ts: Int
      }
      type GoogleBook {
        id: String!
        title: String
        authors: [String]
        publisher: String
        publishedDate: String
        description: String
        pageCount: Int
        categories: [String]
        previewLink: String
        smallThumbnail: String
      }
      type Query {
        localUser: User
        searchGoogleBook(q: String!) [GoogleBook]
        viewGoogleBook(id: String!) GoogleBook
        getBooks(uid: Int) [BookUser]!
      }
      type Mutation {
        updateLocalUser(id: Int!, name: String, email: String, loc: String, token: String, logout: Bool): Bool
      }
    `,
    resolvers: {
      Query: {
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
        getBooks(_, { uid }) {
          return client.query({
            query: gql`query getBooksAndGBooks($uid: Int) {
              getGBooks { id, gid }
              getBooks(uid: $uid) { id, bid, uid, rid, status, ts }
            }`,
            variables: { uid },
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
        searchGoogleBook(_, { q }) {
          q = encodeURIComponent(q)
          return client.query({ query: G_BOOK_API })
            .then(({ data }) => {
              const key = data.getGGAPI
              return fetch('https://www.googleapis.com/books/v1/volumes?maxResults=40&key=' + key + '&q=' + q)
            })
            .then(r => r.json())
            .then(r => r.items.map(trimGoogleBook))
        },
        viewGoogleBook(_, { id }) {
          return client.query({ query: G_BOOK_API })
            .then(({ data }) => {
              const key = data.getGGAPI
              return fetch('https://www.googleapis.com/books/v1/volumes/' + id + '?key=' + key)
            })
            .then(r => r.json())
            .then(trimGoogleBook)
        }
      },
      Mutation: {
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
    }
  },
  cacheRedirects: {
    Query: {
      viewGoogleBook(_, args, { getCacheKey }) {
        return getCacheKey({ __typename: 'GoogleBook', id: args.id })
      }
    }
  },
  // link: new RestLink({
  //   uri: 'https://www.googleapis.com/books/v1/volumes',
  // }),
  // cache: new InMemoryCache(),
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
    id
    bid
    uid
    rid
    status
    ts
  }
}
`

export const DEL_BOOK = gql`mutation delBook($token: String!, $bid: Int!) {
  delBook(token: $token, bid: $bid)
}`

export const TRADE_BOOK = gql` mutation tradeBook($token: String!, $type: TradeType!, $bid: Int!, $rid: Int) {
  tradeBook(token: $token, type: $type, bid: $bid, rid: $rid)
}
`
const f_bookUser = gql`fragment f_bookUser on BookUser { id, gid, bid, uid, rid, status, ts }`

export const GET_GBOOKS = gql`query getGBooks { id, gid }`
export const GET_BOOKS = gql`query getBooks($uid: Int) {
  getBooks(uid: $uid) @client { ...f_bookUser }
}
  ${f_bookUser}
`

export const GET_REQS_BY_BOOK = gql`query getReqsByBook($bid: Int!) {
  getReqsByBook(bid: $bid) { id, bid, uid, rid, status, ts }
}`


const f_gbook = gql`fragment f_gbook on GoogleBook {
  id
  title
  authors
  publisher
  publishedDate
  description
  pageCount
  categories
  previewLink
  smallThumbnail
}
`

const G_BOOK_API = gql`{ getGGAPI }`

export const SEARCH_GOOGLE_BOOK = gql`query searchGoogleBook($q: String!) {
  searchGoogleBook(q: $q) @client {
    ...f_gbook
  }
}
  ${f_gbook}
`
export const VIEW_GOOGLE_BOOK = gql`query viewGoogleBook($id: String!) {
  viewGoogleBook(id: $id) @client {
    ...f_gbook
  }
}
  ${f_gbook}
`


function trimGoogleBook(el) {
  if (el.error) throw new Error('Google Book API encountered an error')
  const { volumeInfo: v } = el
  const { imageLinks: { smallThumbnail = '' } = {} } = v
  const item = {
    __typename: 'GoogleBook',
    id: el.id,
    title: '',
    authors: [],
    publisher: '',
    publishedDate: '',
    description: '',
    pageCount: null,
    categories: [],
    smallThumbnail,
    ...v,
  }
  return item
}
