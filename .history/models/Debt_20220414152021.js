const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  userId: { type: 'String' },
  name: { type: 'String' },
  money: { type: 'Number' },
  category: { type: 'String' },
  mark: { type: 'String' },
  createTime: {
    type: Date,
    default: Date.now,
  },
  expiration: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Income', schema)
