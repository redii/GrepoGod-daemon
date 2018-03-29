const mongoose  = require('mongoose')
const c         = require('../config.json')

mongoose.connect(`mongodb://${c.dburl}:${c.dbport}/${c.dbname}`)      // Connect to mongodb database with specified informations
mongoose.connection.on('connected', function () {
  console.log(`Database connection successful`)
})

module.exports = {mongoose}
