const express = require('express')
const path = require('path')
const app = express()
// 想使用req.body必须添加express.json
app.use(express.json())
// 解决跨域
app.use(require('cors')())
// 静态文件托管
app.use('/uploads', express.static(path.join(__dirname, '/uploads')))
app.set('secret', '1esf18d5ac9e0sf7af')
require('./plugins/db')(app)
require('./routes/index')(app)

app.listen(3001, () => {
  console.log('http://localhost:3001 端口创建成功')
})
