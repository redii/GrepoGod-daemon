const mongoose  = require('mongoose')

mongoose.connect('mongodb://noc.redii.pw:27017/Test')

var Schema = mongoose.Schema
var schema = new Schema({
  id: Number
})

var model = mongoose.model('model1', schema)

var newModel = new model({
  id: 1
})

newModel.save()

var model = mongoose.model('model2', schema)

var newModel2 = new model({
  id: 2
})

newModel2.save()
