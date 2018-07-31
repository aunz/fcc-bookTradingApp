import { ApolloServer } from 'apollo-server-express'
import typeDefs from './typeDefs.gql'
import resolvers from './resolvers'

export default new ApolloServer({
  typeDefs,
  resolvers,
  context({ req, res }) { return { req, res } },
  formatError(error) {
    const { originalError } = error
    if (originalError && originalError.cusError) {
      error.cusError = true
      error.params = originalError.params
      error.code = originalError.code
    }
    if (originalError && originalError.name === 'SqliteError') {
      error.message = 'Internal Server Error'
    }
    const { locations, path, ...newErr } = error
    return newErr
  },
})
