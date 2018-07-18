var mongoose = require('mongoose')
var Schema = mongoose.Schema

var playerSchema = new Schema({     // Mongoose ORM Schema
  playerid: Number,
  name: String,
  allianceid: Number,
  alliancename: String,
  points: [Number],
  rank: [Number],
  towns: [Number],
  killsall: [Number],
  killsall_rank: Number,
  killsoff: [Number],
  killsoff_rank: Number,
  killsdef: [Number],
  killsdef_rank: Number,
  activity: Number,
  killsoff_activity: Number
})

module.exports = {playerSchema}

// https://stackoverflow.com/questions/13337155/mongoose-same-schema-for-different-collections-in-mongodb
// To use the schema in daemon.js you have to set the mongoose.model like this...
// var Player = mongoose.model('DE123', schema)
