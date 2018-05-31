import { graphqlExpress } from 'apollo-server-express'
import bodyParser from 'body-parser'
import { makeExecutableSchema } from 'graphql-tools'

import { getAndUpdateUserFromToken } from '~/server/db/dbFunctions'
import typeDefs from './typeDefs.gql'
import resolvers from './resolvers'

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

export default [
  bodyParser.json(),
  graphqlExpress(function (req, res) {
    req.user = getAndUpdateUserFromToken(req.headers['x-token']) || {}
    return {
      schema,
      context: { req, res },
      formatError(error) {
        const { originalError } = error
        if (originalError && originalError.cusError) {
          // error.message = originalError.message
          error.cusError = true
          error.params = originalError.params
          error.code = originalError.code
          // if (originalError.statusCode) res.status(originalError.statusCode)
        }
        if (originalError && originalError.name === 'SqliteError') {
          error.message = 'Internal Server Error'
          res.status(500)
        }
        const { locations, path, ...newErr } = error
        return newErr
      },
    }
  })
]