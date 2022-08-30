const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  money: { type: 'Number' },
  category: { type: mongoose.SchemaTypes.ObjectId, ref: 'Category' },

  createTime: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model('Notice', schema)
