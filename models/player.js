var mongoose = require('mongoose')

var Schema = mongoose.Schema
var schema = new Schema({     // Mongoose ORM Schema
  id: Number,
  name: String,
  allianceid: Number,
  points: Number,
  rank: Number,
  towns: Number,
  killsall: Number,
  activity: Number
})

module.exports = {schema}

// https://stackoverflow.com/questions/13337155/mongoose-same-schema-for-different-collections-in-mongodb
// To use the schema in daemon.js you have to set the mongoose.model like this...
// var Player = mongoose.model('DE123', schema)
