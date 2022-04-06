const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  title: { type: 'String' },
  content: { type: 'String' },
  createTimes: {
    type: Date,
    default: Date.now,
  },
  updateTime: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Notice', schema)
