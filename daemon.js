// Requiring dependencies and configuration file
// ===========================================
const _           = require('lodash')               // for common methods and functions
const got         = require('got')                  // for http requests
const timestamp   = require('time-stamp')           // for simple timestamp usage
const every       = require('schedule').every       // for scheduling the daemon
const fs          = require('fs')                   // for filesystem actions
const c           = require('./config.json')        // contains credentials, interval value, worlds array etc.
const {mongoose}  = require('./db/mongoose.js')     // for mongodb connection
const {schema}    = require('./models/player.js')   // contains the mongoose orm model for "Player"
var   schedule    = require('./schedule.json')      // Savefile for schedule

// Some initial logging
// ===========================================
console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] Daemon started`)
console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] Specified worlds: ${c.worlds}`)

// ================ MAIN CODE ================
// ===========================================

if ((Date.now() - schedule.lasttime) < 3900000) {
  console.log(Date.now() - schedule.lasttime)
}

every('10s').do(() => {                                                                               // Every 65 Minutes run the script...

  schedule.lasttime = Date.now()                                                                      // Set lasttime parameter to current time
  schedule.counter  = schedule.counter + 1                                                            // increase counter with every runthrough
  fs.writeFileSync('schedule.json', JSON.stringify(schedule))                                         // save schedule object to file
  console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] Repetitions ${schedule.counter}`)                // Logging repetitions

  _.forEach(c.worlds, async function (world) {                                                        // For each specified world in config.json ...
    var data = await reqAPI(world)                                                                    // ... request latest world data from api ...
    var Player = mongoose.model(world, schema)                                                        // ... and set the world specific collection in which the data should get stored

    _.forEach(data.players, function (player) {                                                       // For each player in (API) data.players ...

      Player.findOne({ playerid: player.ID }).then((result) => {                                      // ... find player in database to get object to work with...

        var activity = { points: 0, killsoff: 0 }                                                     // Initialize activity objects

        if (result.points == data.players[player.ID].points) {                                        // Check player points activity
          activity.points = result.activity + 1                                                       // Set activity according
        }
        if (result.killsoff == data.playerkillsoff[player.ID].points) {                               // Check killsoff activity
          activity.killsoff = result.killsoff_activity + 1                                            // Set activity according
        }

        var newPlayer = createPlayerObject(player.ID, data, activity)                                 // Create newPlayer object with api data and activity object

        Player.findOneAndUpdate({ playerid: player.ID }, newPlayer, { upsert: true }, (err) => {      // Find and update player object
          if (err) { console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ERROR FROM FINDONEANDUPDATE()`, err) }
        })

      }).catch((err) => {                                                                             // If player cant be found in database ...
        console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ERROR FROM FINDONE() OR DB WAS EMPTY`, err)

        var activity = { points: 0, killsoff: 0 }                                                     // Initialize activity objects to 0

        var newPlayer = createPlayerObject(player.ID, data, activity)                                 // Create newPlayer object with api data and activity object

        Player.findOneAndUpdate({ playerid: player.ID }, newPlayer, { upsert: true }, (err) => {            // Save new player object to database
          if (err) { console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ERROR FROM FINDONEANDUPDATE() INSIDE CATCH()`, err) }
        })
      })
    })
  })
})

// API query function
// ===========================================
async function reqAPI(world) {
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
  console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ${world} API Requests successful`)
  return res                                                      // Return response object
}

// checkActivity function CURRENTLY FAILING
// ===========================================
function checkActivity(player, data) {
  var activity = {                                                           // Initialize activity variable
    points: 0,
    killsoff: 0
  }

  if (player.points == data.players[player.ID].points) {                     // Check for player points inactivity
    activity.points = player.activity + 1
  }

  if (player.killsoff == data.playerkillsoff[player.ID].points) {            // Check for player points inactivity
    activity.killsoff = player.activity + 1
  }

  return activity
}

// createPlayerObject function
// ===========================================
function createPlayerObject(playerid, data, activity) {
  var newPlayer = {                                                          // Create new Player object to update old one
    playerid:          data.players[playerid].ID,
    name:              data.players[playerid].name,
    allianceid:        data.players[playerid].allianceID,
    points:            data.players[playerid].points,
    rank:              data.players[playerid].rank,
    towns:             data.players[playerid].towns,
    killsall:          data.playerkillsall[playerid].points,
    killsoff:          data.playerkillsoff[playerid].points,
    killsdef:          data.playerkillsdef[playerid].points,
    activity:          activity.points,
    killsoff_activity: activity.killsoff
  }

  return newPlayer
}
