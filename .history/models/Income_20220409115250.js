const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  money: { type: 'Number' },
  category: { type: 'String' },
  createTime: {
    type: Date,
    default: Date.now,
  },
  
})

module.exports = mongoose.model('Notice', schema)
