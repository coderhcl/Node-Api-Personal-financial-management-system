const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  menoy: { type: 'Number' },
  category: { type: 'String' },
  createTime: {
    type: Date,
    default: Date.now,
  },
  updateTime: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Notice', schema)
