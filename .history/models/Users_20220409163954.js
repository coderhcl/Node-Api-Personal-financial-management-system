const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  name: { type: 'String' },
  password: {
    type: 'String',
    select: false,
  },
  phone: { type: 'String' },
  email: { type: 'String' },
  roleId: { type: 'Number', default: 2 },
  sign: { type: 'Number', default: 0 },
  // income: { type: mongoose.SchemaTypes.ObjectId, ref: 'Income' },
  createTime: {
    type: Date,
    default: Date.now,
  },
  updateTime: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Users', schema)
