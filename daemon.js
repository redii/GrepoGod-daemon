// ===========================================================================
// ============================= DEFINING CONSTS =============================
// ===========================================================================
const _                 = require('lodash')                   // for common methods and functions
const got               = require('got')                      // for http requests
const timestamp         = require('time-stamp')               // for simple timestamp usage
const every             = require('schedule').every           // for scheduling the daemon
const fs                = require('fs')                       // for filesystem actions
const c                 = require('./config.json')            // contains credentials, interval value, worlds array etc.
const {mongoose}        = require('./db/mongoose.js')         // for mongodb connection
const {playerSchema}    = require('./db/models/player.js')    // contains the mongoose orm model for "Player"
const {allianceSchema}  = require('./db/models/alliance.js')  // contains the mongoose orm model for "Alliance"
var   schedule          = require('./schedule.json')          // Savefile for schedule

// ===================================
// INITIAL LOGGING
// ===================================
console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] GrepoGod Daemon started`)
console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] Specified worlds: ${c.worlds}`)

// ===========================================================================
// ================================ MAIN CODE ================================
// ===========================================================================

// ===================================
// STARTING / SCHEDULING CODE
// ===================================
if ((Date.now() - schedule.lasttime) < 3600000) {                                                       // If last loop was less than a hour ago...
  var timeout = 3600000 - (Date.now() - schedule.lasttime)                                              // Get difference between last timestamp and current date in ms
  console.log(`Waiting ${Number((timeout/60/1000).toFixed(2))} minutes for scheduling`)                 // Logging with formatted number to minutes and 2 comma values
  setTimeout(daemon, timeout)                                                                           // Wait time in ms then execute daemon
} else {                                                                                                // Else...
  console.log(`Last loop was ${Number(((Date.now() - schedule.lasttime)/60/1000).toFixed(2))} minutes ago.`)   // Logging with formatted number to minutes and 2 comma values
  schedule.counter = 0                                                                                  // Clear schedule couter
  console.log('Counters has been cleared')
  console.log('Think about dropping database for new data... Daemon will start in 30 seconds')
  setTimeout(daemon, 30000)                                                                             // and execute daemon after 1 minute
}
// daemon()   // for dev

// ===================================
// DAEMON CODE
// ===================================
function daemon() {                                                                                   // controls main code execution
  main()                                                                                              // call main function to start
  every('60m').do(() => {                                                                             // Every 60 Minutes run the script...
    main()
  })
}

// ===================================
// MAIN CODE
// ===================================
function main() {                                                                                     // Contains the actual code which gets executed
  schedule.lasttime = Date.now()                                                                      // Set lasttime parameter to current time
  fs.writeFileSync('schedule.json', JSON.stringify(schedule))                                         // save schedule object to file
  console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] Repetitions ${schedule.counter}`)                // Logging repetitions

  _.forEach(c.worlds, async function (world) {                                                        // For each specified world in config.json ...
    var data = await reqAPI(world)                                                                    // ... request latest world data from api ...
    var Player = mongoose.model(world, playerSchema)                                                  // ... and set the world specific collection in which the data should get stored
    var Alliance = mongoose.model(`${world}_alliances`, allianceSchema)                               // ... and set the world specific collection in which the data should get stored

    // ===================================
    // FOREACH LOOP PLAYER
    // ===================================
    _.forEach(data.players, function (player) {                                                       // For each player in API data.players ...
      Player.findOne({ playerid: player.ID }).then((result) => {                                      // ... find player in database to get object to work with...

        var activity = { points: 0, killsoff: 0 }                                                     // Initialize activity objects
        if (result.points == data.players[player.ID].points) {                                        // Check player points activity
          activity.points = result.activity + 1
        }
        if (result.killsoff == data.playerkillsoff[player.ID].points) {                               // Check killsoff activity
          activity.killsoff = result.killsoff_activity + 1                                            // Set activity according
        }

        // console.log(result)
        var newPlayer = createPlayerObject(player.ID, data, activity, false)                          // Create newPlayer object with api data and activity object (false for updating)
        Player.findOneAndUpdate({ playerid: player.ID }, newPlayer, { upsert: true }, (err) => {      // Find and update player object
          if (err) { console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ERROR PLAYERS findOneAndUpdate()`) }
        })
      }).catch((err) => {                                                                             // If player cant be found in database ...
        //console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ERROR findOne() Player doesnt exist`)
        var activity = { points: 0, killsoff: 0 }                                                     // Initialize activity objects to 0
        var newPlayer = createPlayerObject(player.ID, data, activity, true)                           // Create newPlayer object with api data and activity object (true for new object)

        Player.findOneAndUpdate({ playerid: player.ID }, newPlayer, { upsert: true }, (err) => {      // Save new player object to database
          if (err) { console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ERROR PLAYERS findOneAndUpdate() inside catch()`, err) }
        })
      })
    })

    _.forEach(data.alliances, function (alliance) {                                                         // For each alliance in API data.alliances ...
      Alliance.findOne({ allianceid: alliance.ID }).then((result) => {                                      // ... find player in database to get object to work with...
        var newAlliance = createAllianceObject(alliance.ID, data)                                           // Create newPlayer object with api data and activity object
        Alliance.findOneAndUpdate({ allianceid: alliance.ID }, newAlliance, { upsert: true }, (err) => {    // Find and update player object
          if (err) { console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ERROR ALLIANCES findOneAndUpdate()`) }
        })

      }).catch((err) => {                                                                                   // If player cant be found in database ...
        //console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ERROR findOne() Alliance doesnt exist`)
        var newAlliance = createAllianceObject(alliance.ID, data)                                           // Create newPlayer object with api data and activity object

        Alliance.findOneAndUpdate({ allianceid: alliance.ID }, newAlliance, { upsert: true }, (err) => {    // Save new player object to database
          if (err) { console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ERROR ALLIANCES findOneAndUpdate() inside catch()`, err) }
        })
      })
    })

    schedule.counter  = schedule.counter + 1                                                          // increase counter with every loop                                                       // increase alliance counter with every runthrough
 })
}

// ===========================================================================
// ============================== SUBFUNCTIONS ===============================
// ===========================================================================

// ===========================================
// API query function
// ===========================================
async function reqAPI(world) {
  var players_res                 = await got(`${c.api}/players.php?world=${world}`)              // Gather data from players.php
  var playerkillsall_res          = await got(`${c.api}/playerKillsAll.php?world=${world}`)       // Gather data from playerKillsAll.php
  var playerkillsoff_res          = await got(`${c.api}/playerKillsAttack.php?world=${world}`)    // Gather data from playerKillsAttack.php
  var playerkillsdef_res          = await got(`${c.api}/playerKillsDefend.php?world=${world}`)    // Gather data from playerKillsDefend.php
  var islands_res                 = await got(`${c.api}/islands.php?world=${world}`)              // Gather data from islands.php
  var towns_res                   = await got(`${c.api}/towns.php?world=${world}`)                // Gather data from towns.php
  var conquers_res                = await got(`${c.api}/conquers.php?world=${world}`)             // Gather data from conquers.php
  var alliances_res               = await got(`${c.api}/alliances.php?world=${world}`)            // Gather data from alliances.php
  var alliancekillsall_res        = await got(`${c.api}/allianceKillsAll.php?world=${world}`)     // Gather data from allianceKillsAll.php
  var alliancekillsoff_res        = await got(`${c.api}/allianceKillsAttack.php?world=${world}`)  // Gather data from allianceKillsAttack.php
  var alliancekillsdef_res        = await got(`${c.api}/allianceKillsDefend.php?world=${world}`)  // Gather data from allianceKillsDefend.php

  players_res           = JSON.parse(players_res.body)            // Parse response body for data objects
  playerkillsall_res    = JSON.parse(playerkillsall_res.body)
  playerkillsoff_res    = JSON.parse(playerkillsoff_res.body)
  playerkillsdef_res    = JSON.parse(playerkillsdef_res.body)
  islands_res           = JSON.parse(islands_res.body)
  towns_res             = JSON.parse(towns_res.body)
  conquers_res          = JSON.parse(conquers_res.body)
  alliances_res         = JSON.parse(alliances_res.body)
  alliancekillsall_res  = JSON.parse(alliancekillsall_res.body)
  alliancekillsoff_res  = JSON.parse(alliancekillsoff_res.body)
  alliancekillsdef_res  = JSON.parse(alliancekillsdef_res.body)

  var res = {                                                     // define response object with all responses inside
    "players":          players_res.data.players,
    "playerkillsall":   playerkillsall_res.data.players,
    "playerkillsoff":   playerkillsoff_res.data.players,
    "playerkillsdef":   playerkillsdef_res.data.players,
    "islands":          islands_res.data.islands,
    "towns":            towns_res.data.towns,
    "conquers":         conquers_res.data.conquers,
    "alliances":        alliances_res.data.alliances,
    "alliancekillsall": alliancekillsall_res.data.alliances,
    "alliancekillsoff": alliancekillsoff_res.data.alliances,
    "alliancekillsdef": alliancekillsdef_res.data.alliances
  }
  console.log(`[${timestamp('DD.MM.YYYY-HH:mm:ss')}] ${world} API Requests successful`)
  return res                                                      // Return response object
}

// ===========================================
// createPlayerObject function
// ===========================================
function createPlayerObject(playerid, data, activity, mode) {

  var alliance = _.find(data.alliances, { 'ID': data.players[playerid].allianceID})

  if(alliance) {
    var alliancename = alliance.name
  } else {
    var alliancename = 'n/a'
  }

  if(mode == true) {                                                           // If mode = new obejct do...
    var newPlayer = {                                                          // Create new Player object to update old one
      playerid:          data.players[playerid].ID,
      name:              data.players[playerid].name,
      allianceid:        data.players[playerid].allianceID,
      alliancename:      alliancename,
      points:            [data.players[playerid].points],
      rank:              [data.players[playerid].rank],
      towns:             [data.players[playerid].towns],
      killsall:          [data.playerkillsall[playerid].points],
      killsall_rank:     data.playerkillsall[playerid].rank,
      killsoff:          [data.playerkillsoff[playerid].points],
      killsoff_rank:     data.playerkillsoff[playerid].rank,
      killsdef:          [data.playerkillsdef[playerid].points],
      killsdef_rank:     data.playerkillsdef[playerid].rank,
      activity:          activity.points,
      killsoff_activity: activity.killsoff
    }
  } else {                                                                     // If mode = update object do...
    var newPlayer = {                                                          // Create new Player object to update old one
      playerid:          data.players[playerid].ID,
      name:              data.players[playerid].name,
      allianceid:        data.players[playerid].allianceID,
      alliancename:      alliancename,
      $push:             { points: data.players[playerid].points },            // array append/push
      $push:             { rank: data.players[playerid].rank },
      $push:             { towns: data.players[playerid].towns },
      $push:             { killsall: data.playerkillsall[playerid].points },
      $push:             { killsoff: data.playerkillsoff[playerid].points },
      $push:             { killsdef: data.playerkillsdef[playerid].points },
      killsall_rank:     data.playerkillsall[playerid].rank,
      killsoff_rank:     data.playerkillsoff[playerid].rank,
      killsdef_rank:     data.playerkillsdef[playerid].rank,
      activity:          activity.points,
      killsoff_activity: activity.killsoff
    }
  }
  return newPlayer
}

// ===========================================
// createAllianceObject function
// ===========================================
function createAllianceObject(allianceid, data) {
  var newAlliance = {                                                          // Create new Player object to update old one
    allianceid:        data.alliances[allianceid].ID,
    name:              data.alliances[allianceid].name,
    points:            data.alliances[allianceid].points,
    towns:             data.alliances[allianceid].towns,
    members:           data.alliances[allianceid].members,
    rank:              data.alliances[allianceid].rank,
    killsall:          data.alliancekillsall[allianceid].points,
    killsall_rank:     data.alliancekillsall[allianceid].rank,
    killsoff:          data.alliancekillsoff[allianceid].points,
    killsoff_rank:     data.alliancekillsoff[allianceid].rank,
    killsdef:          data.alliancekillsdef[allianceid].points,
    killsdef_rank:     data.alliancekillsdef[allianceid].rank
  }
  return newAlliance
}
