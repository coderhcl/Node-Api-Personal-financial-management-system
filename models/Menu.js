const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  name: { type: 'String' },
  type: { type: 'Number' },
  url: { type: 'String' },
  icon: { type: 'String' },
  children: [
    {
      name: { type: 'String' },
      type: { type: 'Number' },
      url: { type: 'String' },
      icon: { type: 'String' },
      children: [Object],
    },
  ],
})
module.exports = mongoose.model('Menu', schema)
