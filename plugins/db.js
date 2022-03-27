module.exports = (app) => {
  const mongoose = require('mongoose')
  mongoose
    .connect('mongodb://127.0.0.1:27017/vuecms', {
      useNewUrlParser: true,
    })
    .then(() => {
      console.log('cms数据库连接成功')
    })
}
