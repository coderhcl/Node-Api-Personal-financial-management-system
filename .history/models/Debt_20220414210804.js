const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  userId: { type: 'String' },
  name: { type: 'String' },
  money: { type: 'Number' },
  category: { type: 'String' },
  remark: { type: 'String' },
  mark: { type: 'Number',default: Date.now, },
  createTime: {
    type: Date,
    default: Date.now,
  },
  expirationTime: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Debt', schema)
