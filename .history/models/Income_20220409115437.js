const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  money: { type: 'Number' },
  category: { type: mongoose.SchemaTypes.ObjectId, ref: 'IncomeCategory' },
remark
  createTime: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Notice', schema)
