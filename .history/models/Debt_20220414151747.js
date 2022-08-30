const mongoose = require('mongoose')
const schema = new mongoose.Schema({
  userId: { type: 'String' },
  name: { type: 'String' },
  money: { type: 'Number' },
  category: { type: 'String' },
  createTime: {
    type: Date,
    default: Date.now,
  },
  
到期
到期到期
2/5000
通用领域
生物医学
金融财经
expiration
})

module.exports = mongoose.model('Income', schema)
