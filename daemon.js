// Requiring dependencies and configuration file
// ===========================================
const _           = require('lodash')               // for common methods and functions
const got         = require('got')                  // for http requests
const c           = require('./config.json')        // contains credentials, interval value, worlds array etc.
const {mongoose}  = require('./db/mongoose.js')     // for mongodb connection
const {schema}    = require('./models/player.js')   // contains the mongoose orm model for Player

// Some initial logging
// ===========================================
console.log('Starting daemon!')
console.log(`Specified worlds: ${c.worlds}`)

// ============== MAIN FUNCTION ==============
// ===========================================
function routine() {

  _.forEach(c.worlds, async function (world) {      // For each specified world in config.json ...
    var data = await reqAPI(world)                  // ... request latest world data from api ...
    var Player = mongoose.model(world, schema)      // ... and set the world specific collection in which the data should get stored

    _.forEach(data.players, function (player) {     // For each player in data.players ...
      var activity = 0

      Player.findOne({ name: player.name }).then((result) => {    // Find db object for current player in forEach loop
        if (result.points == player.points) {       // Check points activity
          activity = result.activity + 1
        } else {
          activity = 0
        }
      }).catch(() => {
        console.log('Nothing found!')
        activity = 0
      })

      console.log(activity)
      var newPlayer = new Player({                  // Generating new player object with api data
        id: player.ID,
        name: player.name,
        allianceid: player.allianceID,
        points: player.points,
        rank: player.rank,
        towns: player.towns,
        killsall: data.playerkillsall[player.ID].points,
        killoff: data.playerkillsoff[player.ID].points,
        killdef: data.playerkillsdef[player.ID].points,
        activity: activity
      })

      Player.findOneAndUpdate({ name: player.name }, newPlayer, { upsert: true }, (err) => {      // Updating each player object
        //if (err) { console.log(err) }
      })
    })
  })
  //mongoose.disconnect()     // Closing the mongoose db connection CURRENTLY FAILING
}

// ============== SUB FUNCTIONS ==============
// ===========================================

// API query function
// ===========================================
async function reqAPI(world) {
  console.log(`Starting API requests for ${world}`)
  var players_res                 = await got(`${c.api}/players.php?world=${world}`)              // Gather data from players.php
  var playerkillsall_res          = await got(`${c.api}/playerKillsAll.php?world=${world}`)       // Gather data from playerKillsAll.php
  var playerkillsoff_res          = await got(`${c.api}/playerKillsAttack.php?world=${world}`)    // Gather data from playerKillsAttack.php
  var playerkillsdef_res          = await got(`${c.api}/playerKillsDefend.php?world=${world}`)    // Gather data from playerKillsDefend.php
  var alliances_res               = await got(`${c.api}/alliances.php?world=${world}`)            // Gather data from alliances.php
  var alliancekillsall_res        = await got(`${c.api}/allianceKillsAll.php?world=${world}`)     // Gather data from allianceKillsAll.php
  var alliancekillsoff_res        = await got(`${c.api}/allianceKillsAttack.php?world=${world}`)  // Gather data from allianceKillsAttack.php
  var alliancekillsdef_res        = await got(`${c.api}/allianceKillsDefend.php?world=${world}`)  // Gather data from allianceKillsDefend.php
  var islands_res                 = await got(`${c.api}/islands.php?world=${world}`)              // Gather data from islands.php
  var towns_res                   = await got(`${c.api}/towns.php?world=${world}`)                // Gather data from towns.php
  var conquers_res                = await got(`${c.api}/conquers.php?world=${world}`)             // Gather data from conquers.php

  players_res           = JSON.parse(players_res.body)            // Parse response body for data objects
  playerkillsall_res    = JSON.parse(playerkillsall_res.body)
  playerkillsoff_res    = JSON.parse(playerkillsoff_res.body)
  playerkillsdef_res    = JSON.parse(playerkillsdef_res.body)
  alliances_res         = JSON.parse(alliances_res.body)
  alliancekillsall_res  = JSON.parse(alliancekillsall_res.body)
  alliancekillsoff_res  = JSON.parse(alliancekillsoff_res.body)
  alliancekillsdef_res  = JSON.parse(alliancekillsdef_res.body)
  islands_res           = JSON.parse(islands_res.body)
  towns_res             = JSON.parse(towns_res.body)
  conquers_res          = JSON.parse(conquers_res.body)

  var res = {                                                     // define response object with all responses inside
    "players":          players_res.data.players,
    "playerkillsall":   playerkillsall_res.data.players,
    "playerkillsoff":   playerkillsoff_res.data.players,
    "playerkillsdef":   playerkillsdef_res.data.players,
    "alliances":        alliances_res.data.players,
    "alliancekillsall": alliancekillsall_res.data.players,
    "alliancekillsoff": alliancekillsoff_res.data.players,
    "alliancekillsdef": alliancekillsdef_res.data.players,
    "islands":          islands_res.data.players,
    "towns":            towns_res.data.players,
    "conquers":         conquers_res.data.players
  }
  console.log(`API requests for ${world} were successful`)
  return res                                                       // Return response object
}

// Kick off!
// ===========================================
routine()
//setTimeout(3900)
