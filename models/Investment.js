const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  userId: { type: 'String' },
  category: { type: 'String' },
  name: { type: 'String' },
  money: { type: 'Number', default: 0 },
  rate: { type: 'Number', default: 0 },
  createTime: {
    type: Date,
    default: Date.now,
  },
  age: { type: 'Number', default: 0 },
  remark: { type: 'String' },
})

module.exports = mongoose.model('Investment', schema)
