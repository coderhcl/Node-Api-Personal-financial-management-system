const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  userId: { type: 'String' },
  name: { type: 'String' },
  money: { type: 'Number' },
  category: { type: 'String' },
  createTime: {
    type: Date,
    default: Date.now,
  },
  expiration:
})

module.exports = mongoose.model('Income', schema)
