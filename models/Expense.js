const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  userId: { type: 'String' },
  money: { type: 'Number' },
  category: { type: 'String' },
  remark: { type: 'String' },
  createTime: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Expense', schema)
