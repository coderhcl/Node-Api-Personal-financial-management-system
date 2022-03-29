module.exports = (app) => {
  const express = require('express')
  const Users = require('../models/Users')
  const Menu = require('../models/Menu')
  const AdminMenu = require('../models/AdminMenu')
  const jwt = require('jsonwebtoken')
  const { desEncrypt, desDecrypt } = require('../plugins/des-crypto')
  const router = express.Router({
    mergeParams: true,
  })

  const KEY = '01234567'

  // 登录校验中间件
  const authMeddleware = async (req, res, next) => {
    // 获取请求头
    const token = String(req.headers.authorization || '')
      .split(' ')
      .pop()
    if (!token) {
      return res.status(401).send({
        message: '请先登录(token)',
      })
    }
    const { id } = jwt.verify(token, app.get('secret'))
    if (!id) {
      return res.status(401).send({
        message: 'id验证错误',
      })
    }
    req.user = await Users.findById(id)
    // console.log(req.user)
    if (!req.user) {
      return res.status(401).send({
        message: '请先登录',
      })
    }
    await next()
  }

  // 登录
  router.post('/login', async (req, res) => {
    const { name, password } = req.body
    const user = await Users.findOne({ name: name }).select('+password')
    if (!user) {
      return res.send({
        code: -1,
        data: {
          message: '用户不存在',
        },
      })
    }
    // 2.校验密码
    if (!(password === desDecrypt(user.password, KEY))) {
      return res.send({
        code: -1,
        data: {
          message: '密码错误',
        },
      })
    }

    // 3.返回token
    const token = jwt.sign(
      {
        id: user._id,
      },
      app.get('secret')
    )
    // console.log(user.name)
    // console.log(user.roleId)

    res.send({
      code: 1,
      data: {
        _id: user._id,
        name: user.name,
        roleId: user.roleId,
        token: token,
        message: '登录成功',
      },
    })
  })

  // 注册
  router.post('/registration', async (req, res) => {
    // console.log(req.body.password)
    req.body.password = desEncrypt(req.body.password, KEY)
    const name = await Users.findOne({ name: req.body.name })
    if (name) {
      return res.send({
        code: -1,
        data: {
          message: '账号已被注册',
        },
      })
    }
    const phone = await Users.findOne({ phone: req.body.phone })
    if (phone) {
      return res.send({
        code: -1,
        data: {
          message: '手机号已注册',
        },
      })
    }
    const email = await Users.findOne({ email: req.body.email })
    if (email) {
      return res.send({
        code: -1,
        data: {
          message: '邮箱已注册',
        },
      })
    }

    const result = await Users.create(req.body)
    if (result)
      res.send({
        code: 1,
        data: {
          message: '登录成功',
        },
      })
  })
  // 忘记密码
  router.get('/forget', async (req, res) => {
    const result = await Users.findOne({ name: req.query.name })
    if (result === null) {
      return res.send({
        code: -1,
        data: {
          message: '账号不存在',
        },
      })
    }
    if (req.query.phone != result.phone) {
      return res.send({
        code: -1,
        data: {
          message: '手机号不正确',
        },
      })
    }
    if (req.query.email != result.email) {
      return res.send({
        code: -1,
        data: {
          message: '邮箱不正确',
        },
      })
    }
    res.send({
      code: 1,
      data: {
        id: result._id,
        message: '请输入新密码',
      },
    })
  })

  // 修改密码到后端
  router.patch('/patchpasswords', async (req, res) => {
    const password = desEncrypt(req.body.password, KEY)
    const id = req.body.id
    const result = Users.findOneAndUpdate(
      { _id: id },
      { $set: { password: password } },
      { new: true }
    )
      .then((result) => {
        res.send({
          code: 1,
          data: {
            message: '密码修改成功，请重新登录',
          },
        })
      })
      .catch((err) => {
        res.send({
          code: -1,
          data: {
            message: '更改失败',
          },
        })
      })
  })

  // 获取单个用户信息
  router.get('/user/:id', authMeddleware, async (req, res) => {
    const user = await Users.findById(req.params.id)
    res.send({
      code: 1,
      data: {
        _id: user._id,
        name: user.name,
        message: '登录成功',
      },
    })
  })

  // 获取管理员菜单
  router.get('/adminmenu', async (req, res) => {
    const Admin = await AdminMenu.find()
    res.send({
      code: 1,
      data: {
        menus: Admin,
      },
    })
  })
  // 获取普通用户菜单
  router.get('/menu', async (req, res) => {
    const menu = await Menu.find()
    res.send({
      code: 1,
      data: {
        menus: menu,
      },
    })
  })

  app.use('/api', router)
}
