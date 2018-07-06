var mongoose = require('mongoose')

var Schema = mongoose.Schema
var allianceSchema = new Schema({     // Mongoose ORM Schema
  allianceid: Number,
  name: String,
  points: Number,
  towns: Number,
  members: Number,
  rank: Number,
  killsall: Number,
  killsall_rank: Number,
  killsoff: Number,
  killsoff_rank: Number,
  killsdef: Number,
  killsdef_rank: Number,
})

module.exports = {allianceSchema}

// https://stackoverflow.com/questions/13337155/mongoose-same-schema-for-different-collections-in-mongodb
// To use the schema in daemon.js you have to set the mongoose.model like this...
// var Player = mongoose.model('DE123', schema)
