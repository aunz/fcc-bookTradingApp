import memoize from 'lodash/memoize'

const db = new (require('better-sqlite3'))(
  process.env.NODE_ENV === 'production' ?
    process.env.SQLITE_PATH || './.data/bookTradingApp' :
    './.data/bookTradingApp__DEV'
  ,
  { memory: !!process.env.TEST }
)

db.pragma('foreign_keys = ON')
db.prepare = memoize(db.prepare)
db.transaction = memoize(db.transaction)

if (process.env.NODE_ENV === 'production') {
  // make sure tables exist
  db.prepare('select 1 from "user" limit 1').get()
  db.prepare('select 1 from "poll" limit 1').get()
}

export default db
