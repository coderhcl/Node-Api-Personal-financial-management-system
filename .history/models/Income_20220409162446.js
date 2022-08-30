const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  userId: { type: 'String' },
  money: { type: 'Number' },
  category: { type: mongoose.SchemaTypes.ObjectId, ref: 'IncomeCategory' },
  remark: { type: 'String' },
  createTime: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Income', schema)
