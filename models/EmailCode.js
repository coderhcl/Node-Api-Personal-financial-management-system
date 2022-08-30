const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  email: { type: 'String' },
  code: { type: 'Number' },
  createTime: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('EmailCode', schema)
