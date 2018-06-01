import db from '../sqlite'
db.exec(require('./dropTable.sql'))
db.exec(require('./createTable.sql'))
