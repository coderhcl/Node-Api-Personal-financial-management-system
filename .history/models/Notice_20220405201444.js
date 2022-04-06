const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  title: { type: 'String' },
  password: {
    type: 'String',
    select: false,
  },
  phone: { type: 'String' },
  email: { type: 'String' },
  createTimes: {
    type: Date,
    default: Date.now,
  },
  updateTime: {
    type: Date,
    default: Date.now,
  },
  roleId: { type: 'Number', default: 2 },
})

module.exports = mongoose.model('Users', schema)
