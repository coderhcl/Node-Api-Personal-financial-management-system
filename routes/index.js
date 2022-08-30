module.exports = (app) => {
  const express = require('express')
  const Users = require('../models/Users')
  const Menu = require('../models/Menu')
  const AdminMenu = require('../models/AdminMenu')
  const IncomeCategory = require('../models/IncomeCategory')
  const ExpenseCategory = require('../models/ExpenseCategory')
  const InvestmentCategory = require('../models/InvestmentCategory')
  const DebtCategory = require('../models/DebtCategory')
  const Notice = require('../models/Notice')
  const Income = require('../models/Income')
  const Expense = require('../models/Expense')
  const Debt = require('../models/Debt')
  const Investment = require('../models/Investment')
  const EmailCode = require('../models/EmailCode')
  const nodemailer = require('nodemailer')
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
  // 图片接口
  const multer = require('multer')
  const upload = multer({ dest: __dirname + '/../uploads' })
  router.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file
    file.url = `http://localhost:3001/uploads/${file.filename}`
    res.send(file)
  })
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
  // 邮件验证码
  // 发送邮件验证码
  router.post('/getcode', async (req, res) => {
    // 创建验证码
    await EmailCode.findOneAndDelete({ email: req.body.email })
    let code = Math.floor(Math.random() * 900000) + 100000
    // 建立一个smtp链接
    let transporter = nodemailer.createTransport({
      host: 'smtp.163.com',
      secureConnection: true,
      port: 465,
      auth: {
        user: 'huangcanlin0810@163.com',
        pass: 'XWBZXPZMXBWSAZXD',
      },
    })
    // 配置一个相关参数
    let options = {
      from: 'huangcanlin0810@163.com',
      to: `huangcanlin0810@163.com,${req.body.email}`,
      subject: '【个人财务管理系统】',
      html: `
      <div style="width: 600px; margin: 30px auto">
        <h1 style="text-align: center">欢迎使用个人财务管理系统</h1>
        <p
          style="font-size: 24px; display: block; text-align: center; color: red"
        >
          <strong>验证码：${code}</strong>
        </p>
        <p>验证码15分钟有效，请及时输入</p>
        <i style="color: #00bfff"
          >此邮件为系统自动发送，请勿回复！若您没有进行注册，请忽略</i
        >
        <p style="text-align: right">--个人财务管理系统官方</p>
      </div>`,
    }

    // 发送之前把前端传过来的email 和 自动生成的 code 存在数据库中，数据库为usercode 字段：email，code，createtime，如果当前时间减去创建时间＞15分钟就删除该字段
    const result = EmailCode.create({
      email: req.body.email,
      code: code,
    })
    if (result.code < 0) {
      return res.send({
        code: -1,
        data: {
          message: '验证码存入失败',
        },
      })
    }
    // 发送验证码
    transporter.sendMail(options, function (err, msg) {
      if (err) {
        console.log(err)
      } else {
        res.send({
          code: 1,
          data: {
            result: msg,
            message: '发送成功,请稍后！',
          },
        })
        transporter.close()
      }
    })
  })

  // 注册
  router.post('/registration', async (req, res) => {
    req.body.password = desEncrypt(req.body.password, KEY)
    req.body.roleId = 2
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
          message: '手机已被注册',
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
    const findcode = await EmailCode.findOne({ email: req.body.email })
    if (parseInt(req.body.code) !== findcode.code) {
      return res.send({
        code: -1,
        data: {
          message: '验证码错误',
        },
      })
    }
    const result = await Users.create(req.body)
    if (result)
      res.send({
        code: 1,
        data: {
          message: '注册成功！正在登录...',
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
    const findcode = await EmailCode.findOne({ email: req.query.email })
    if (parseInt(req.query.code) !== findcode.code) {
      return res.send({
        code: -1,
        data: {
          message: '验证码错误',
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
    const user = await Users.findById(req.params.id).select('+password')
    user.password = desDecrypt(user.password, KEY)
    res.send({
      code: 1,
      data: {
        _id: user._id,
        name: user.name,
        user: user,
        message: '登录成功',
      },
    })
  })

  // 获取管理员菜单
  router.get('/adminmenu', authMeddleware, async (req, res) => {
    const Admin = await AdminMenu.find()
    res.send({
      code: 1,
      data: {
        menus: Admin,
      },
    })
  })
  // 获取普通用户菜单
  router.get('/menu', authMeddleware, async (req, res) => {
    const menu = await Menu.find()
    res.send({
      code: 1,
      data: {
        menus: menu,
      },
    })
  })

  // 获取用户列表、按要求查询、分页
  router.post('/users/list', authMeddleware, async (req, res) => {
    const { offset, size, formData } = req.body
    const skipNumber = (offset - 1) * size
    if (formData) {
      const totalCount = await Users.find({
        name: { $regex: formData.name },
        phone: { $regex: formData.phone },
        email: { $regex: formData.email },
      })
      const userList = await Users.find({
        name: { $regex: formData.name },
        phone: { $regex: formData.phone },
        email: { $regex: formData.email },
      })
        .skip(skipNumber)
        .limit(size)
      if (formData.roleId && !formData.createTime) {
        const totalCount = await Users.find({
          name: { $regex: formData.name },
          phone: { $regex: formData.phone },
          email: { $regex: formData.email },
          roleId: formData.roleId,
        })
        const userList = await Users.find({
          name: { $regex: formData.name },
          phone: { $regex: formData.phone },
          email: { $regex: formData.email },
          roleId: formData.roleId,
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: userList,
            totalCount: totalCount.length,
          },
        })
      }
      if (formData.createTime && !formData.roleId) {
        const totalCount = await Users.find({
          name: { $regex: formData.name },
          phone: { $regex: formData.phone },
          email: { $regex: formData.email },
          createTime: {
            $gt: formData.searchTime[0],
            $lt: formData.searchTime[1],
          },
        })
        const userList = await Users.find({
          name: { $regex: formData.name },
          phone: { $regex: formData.phone },
          email: { $regex: formData.email },
          createTime: {
            $gt: formData.searchTime[0],
            $lt: formData.searchTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: userList,
            totalCount: totalCount.length,
          },
        })
      }
      if (formData.roleId && formData.createTime) {
        const totalCount = await Users.find({
          name: { $regex: formData.name },
          phone: { $regex: formData.phone },
          email: { $regex: formData.email },
          roleId: formData.roleId,
          createTime: {
            $gt: formData.searchTime[0],
            $lt: formData.searchTime[1],
          },
        })
        const userList = await Users.find({
          name: { $regex: formData.name },
          phone: { $regex: formData.phone },
          email: { $regex: formData.email },
          roleId: formData.roleId,
          createTime: {
            $gt: formData.searchTime[0],
            $lt: formData.searchTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: userList,
            totalCount: totalCount.length,
          },
        })
      }
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    const userList = await Users.find({}).skip(skipNumber).limit(size)
    const totalCount = await Users.find()
    res.send({
      code: 1,
      data: {
        list: userList,
        totalCount: totalCount.length,
      },
    })
  })

  // 添加新用户
  router.post('/addUser', authMeddleware, async (req, res) => {
    req.body.password = desEncrypt(req.body.password, KEY)
    const name = await Users.findOne({ name: req.body.name })
    if (name) {
      return res.send({
        code: -1,
        data: {
          message: '账号已存在',
        },
      })
    }
    const phone = await Users.findOne({ phone: req.body.phone })
    if (phone) {
      return res.send({
        code: -1,
        data: {
          message: '手机号已存在',
        },
      })
    }
    const email = await Users.findOne({ email: req.body.email })
    if (email) {
      return res.send({
        code: -1,
        data: {
          message: '邮箱已存在',
        },
      })
    }

    const result = await Users.create(req.body)
    if (result)
      res.send({
        code: 1,
        data: {
          message: '添加成功',
        },
      })
  })

  // 编辑用户用户
  router.patch('/patchUser/:id', authMeddleware, async (req, res) => {
    if (req.body.password) {
      req.body.password = desEncrypt(req.body.password, KEY)
    }
    const { name, phone, email } = await Users.findById(req.params.id)

    if (req.body.name != name) {
      const username = await Users.findOne({ name: req.body.name })
      if (username) {
        return res.send({
          code: -1,
          data: {
            message: '账号已存在',
          },
        })
      }
    }

    if (req.body.phone != phone) {
      const userphone = await Users.findOne({ phone: req.body.phone })
      if (userphone) {
        return res.send({
          code: -1,
          data: {
            message: '手机号已存在',
          },
        })
      }
    }
    if (req.body.email != email) {
      const useremail = await Users.findOne({ email: req.body.email })
      if (useremail) {
        return res.send({
          code: -1,
          data: {
            message: '邮箱已存在',
          },
        })
      }
    }

    const result = await Users.findByIdAndUpdate(req.params.id, req.body)
    const userInfo = await Users.findById(req.params.id).select('+password')
    userInfo.password = desDecrypt(userInfo.password, KEY)
    if (result)
      res.send({
        code: 1,
        data: {
          user: userInfo,
          message: '修改成功',
        },
      })
  })
  // 删除用户
  router.delete('/deleteUser/:id', authMeddleware, async (req, res) => {
    const deleteUserResult = Users.findByIdAndDelete(
      req.params.id,
      (err, docs) => {
        if (err) {
          return res.send({
            code: -1,
            data: {
              message: '删除失败',
            },
          })
        } else {
          return res.send({
            code: 1,
            data: {
              name: docs.name,
              message: '删除成功',
            },
          })
        }
      }
    )
  })
  // ############收入分类##############
  // 添加收入分类
  router.post('/income/category', authMeddleware, async (req, res) => {
    // console.log(req.body)
    const fundIt = await IncomeCategory.findOne({ name: req.body.name })
    if (fundIt) {
      return res.send({
        code: -1,
        data: {
          message: '分类已存在',
        },
      })
    }
    const result = await IncomeCategory.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加分类成功',
      },
    })
  })
  // 获取收入分类
  router.get('/income/category', authMeddleware, async (req, res) => {
    const totalCount = await IncomeCategory.find()
    const data = await IncomeCategory.find()
    res.send({
      code: 1,
      data: {
        categoryList: data,
        totalCount: totalCount.length,
      },
    })
  })
  // 编辑收入分类
  router.patch(
    '/income/patchCategory/:id',
    authMeddleware,
    async (req, res) => {
      const name = await IncomeCategory.findOne({ name: req.body.name })
      if (name) {
        return res.send({
          code: -1,
          data: {
            message: '分类已存在',
          },
        })
      }
      const result = await IncomeCategory.findByIdAndUpdate(
        req.params.id,
        req.body
      )
      res.send({
        code: 1,
        data: {
          message: '更改成功',
        },
      })
    }
  )
  // 收入搜索，分页等功能
  router.post('/income/category/list', authMeddleware, async (req, res) => {
    const { offset, size, formData } = req.body

    const skipNumber = (offset - 1) * size
    if (formData.name && formData.createTime) {
      const totalCount = await IncomeCategory.find({
        name: { $regex: formData.name },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const userList = await IncomeCategory.find({
        name: { $regex: formData.name },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.name && !formData.createTime) {
      const totalCount = await IncomeCategory.find({
        name: { $regex: formData.name },
      })
      const userList = await IncomeCategory.find({
        name: { $regex: formData.name },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.createTime && !formData.name) {
      const totalCount = await IncomeCategory.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const userList = await IncomeCategory.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    const userList = await IncomeCategory.find({}).skip(skipNumber).limit(size)
    const totalCount = await IncomeCategory.find()
    res.send({
      code: 1,
      data: {
        list: userList,
        totalCount: totalCount.length,
      },
    })
  })
  // 删除收入分类
  router.delete(
    '/income/deleteCategory/:id',
    authMeddleware,
    async (req, res) => {
      const deleteUserResult = IncomeCategory.findByIdAndDelete(
        req.params.id,
        (err, docs) => {
          if (err) {
            return res.send({
              code: -1,
              data: {
                message: '删除失败',
              },
            })
          } else {
            return res.send({
              code: 1,
              data: {
                name: docs.name,
                message: '删除成功',
              },
            })
          }
        }
      )
    }
  )

  // ############支出分类################
  // 添加支出分类
  router.post('/expense/category', authMeddleware, async (req, res) => {
    // console.log(req.body)
    const fundIt = await ExpenseCategory.findOne({ name: req.body.name })
    if (fundIt) {
      return res.send({
        code: -1,
        data: {
          message: '分类已存在',
        },
      })
    }
    const result = await ExpenseCategory.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加分类成功',
      },
    })
  })
  // 获取支出分类
  router.get('/expense/category', authMeddleware, async (req, res) => {
    const totalCount = await ExpenseCategory.find()
    const data = await ExpenseCategory.find()
    res.send({
      code: 1,
      data: {
        categoryList: data,
        totalCount: totalCount.length,
      },
    })
  })
  // 编辑支出分类
  router.patch(
    '/expense/patchCategory/:id',
    authMeddleware,
    async (req, res) => {
      const name = await ExpenseCategory.findOne({ name: req.body.name })
      if (name) {
        return res.send({
          code: -1,
          data: {
            message: '分类已存在',
          },
        })
      }
      const result = await ExpenseCategory.findByIdAndUpdate(
        req.params.id,
        req.body
      )
      res.send({
        code: 1,
        data: {
          message: '更改成功',
        },
      })
    }
  )
  // 支出搜索，分页等功能
  router.post('/expense/category/list', authMeddleware, async (req, res) => {
    const { offset, size, formData } = req.body
    const skipNumber = (offset - 1) * size
    if (formData.name && formData.createTime) {
      const totalCount = await ExpenseCategory.find({
        name: { $regex: formData.name },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const userList = await ExpenseCategory.find({
        name: { $regex: formData.name },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.name && !formData.createTime) {
      const totalCount = await ExpenseCategory.find({
        name: { $regex: formData.name },
      })
      const userList = await ExpenseCategory.find({
        name: { $regex: formData.name },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.createTime && !formData.name) {
      const totalCount = await ExpenseCategory.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const userList = await ExpenseCategory.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    const userList = await ExpenseCategory.find({}).skip(skipNumber).limit(size)
    const totalCount = await ExpenseCategory.find()
    res.send({
      code: 1,
      data: {
        list: userList,
        totalCount: totalCount.length,
      },
    })
  })
  // 删除支出分类
  router.delete('/expense/deleteCategory/:id', authMeddleware, (req, res) => {
    const deleteUserResult = ExpenseCategory.findByIdAndDelete(
      req.params.id,
      (err, docs) => {
        if (err) {
          return res.send({
            code: -1,
            data: {
              message: '删除失败',
            },
          })
        } else {
          return res.send({
            code: 1,
            data: {
              name: docs.name,
              message: '删除成功',
            },
          })
        }
      }
    )
  })

  // ############投资分类################
  // 添加投资分类
  router.post('/investment/category', authMeddleware, async (req, res) => {
    // console.log(req.body)
    const fundIt = await InvestmentCategory.findOne({ name: req.body.name })
    if (fundIt) {
      return res.send({
        code: -1,
        data: {
          message: '分类已存在',
        },
      })
    }
    const result = await InvestmentCategory.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加分类成功',
      },
    })
  })
  // 获取投资分类
  router.get('/investment/category', authMeddleware, async (req, res) => {
    const totalCount = await InvestmentCategory.find()
    const data = await InvestmentCategory.find()
    res.send({
      code: 1,
      data: {
        categoryList: data,
        totalCount: totalCount.length,
      },
    })
  })
  // 编辑投资分类
  router.patch(
    '/investment/patchCategory/:id',
    authMeddleware,
    async (req, res) => {
      const name = await InvestmentCategory.findOne({ name: req.body.name })
      if (name) {
        return res.send({
          code: -1,
          data: {
            message: '分类已存在',
          },
        })
      }
      const result = await InvestmentCategory.findByIdAndUpdate(
        req.params.id,
        req.body
      )
      res.send({
        code: 1,
        data: {
          message: '更改成功',
        },
      })
    }
  )
  // 投资搜索，分页等功能
  router.post('/investment/category/list', authMeddleware, async (req, res) => {
    const { offset, size, formData } = req.body
    const skipNumber = (offset - 1) * size
    if (formData.name && formData.createTime) {
      const totalCount = await InvestmentCategory.find({
        name: { $regex: formData.name },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const userList = await InvestmentCategory.find({
        name: { $regex: formData.name },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.name && !formData.createTime) {
      const totalCount = await InvestmentCategory.find({
        name: { $regex: formData.name },
      })
      const userList = await InvestmentCategory.find({
        name: { $regex: formData.name },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.createTime && !formData.name) {
      const totalCount = await InvestmentCategory.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const userList = await InvestmentCategory.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    const userList = await InvestmentCategory.find({})
      .skip(skipNumber)
      .limit(size)
    const totalCount = await InvestmentCategory.find()
    res.send({
      code: 1,
      data: {
        list: userList,
        totalCount: totalCount.length,
      },
    })
  })
  // 删除投资分类
  router.delete(
    '/investment/deleteCategory/:id',
    authMeddleware,
    async (req, res) => {
      const deleteUserResult = InvestmentCategory.findByIdAndDelete(
        req.params.id,
        (err, docs) => {
          if (err) {
            return res.send({
              code: -1,
              data: {
                message: '删除失败',
              },
            })
          } else {
            return res.send({
              code: 1,
              data: {
                name: docs.name,
                message: '删除成功',
              },
            })
          }
        }
      )
    }
  )

  // ############债务分类################
  // 添加债务分类
  router.post('/debt/category', authMeddleware, async (req, res) => {
    // console.log(req.body)
    const fundIt = await DebtCategory.findOne({ name: req.body.name })
    if (fundIt) {
      return res.send({
        code: -1,
        data: {
          message: '分类已存在',
        },
      })
    }
    const result = await DebtCategory.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加分类成功',
      },
    })
  })
  // 获取债务分类
  router.get('/debt/category', authMeddleware, async (req, res) => {
    const totalCount = await DebtCategory.find()
    const data = await DebtCategory.find()
    res.send({
      code: 1,
      data: {
        categoryList: data,
        totalCount: totalCount.length,
      },
    })
  })
  // 编辑投资分类
  router.patch('/debt/patchCategory/:id', authMeddleware, async (req, res) => {
    const name = await DebtCategory.findOne({ name: req.body.name })
    if (name) {
      return res.send({
        code: -1,
        data: {
          message: '分类已存在',
        },
      })
    }
    const result = await DebtCategory.findByIdAndUpdate(req.params.id, req.body)
    res.send({
      code: 1,
      data: {
        message: '更改成功',
      },
    })
  })
  // 债务搜索，分页等功能
  router.post('/debt/category/list', authMeddleware, async (req, res) => {
    const { offset, size, formData } = req.body
    const skipNumber = (offset - 1) * size
    if (formData.name && formData.createTime) {
      const totalCount = await DebtCategory.find({
        name: { $regex: formData.name },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const userList = await DebtCategory.find({
        name: { $regex: formData.name },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.name && !formData.createTime) {
      const totalCount = await DebtCategory.find({
        name: { $regex: formData.name },
      })
      const userList = await DebtCategory.find({
        name: { $regex: formData.name },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.createTime && !formData.name) {
      const totalCount = await DebtCategory.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const userList = await DebtCategory.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    const userList = await DebtCategory.find({}).skip(skipNumber).limit(size)
    const totalCount = await DebtCategory.find()
    res.send({
      code: 1,
      data: {
        list: userList,
        totalCount: totalCount.length,
      },
    })
  })
  // 删除债务分类
  router.delete(
    '/debt/deleteCategory/:id',
    authMeddleware,
    async (req, res) => {
      const deleteUserResult = DebtCategory.findByIdAndDelete(
        req.params.id,
        (err, docs) => {
          if (err) {
            return res.send({
              code: -1,
              data: {
                message: '删除失败',
              },
            })
          } else {
            return res.send({
              code: 1,
              data: {
                name: docs.name,
                message: '删除成功',
              },
            })
          }
        }
      )
    }
  )

  // ############公告################
  // 添加公告
  router.post('/notice', authMeddleware, async (req, res) => {
    // console.log(req.body)
    const fundIt = await Notice.findOne({ title: req.body.title })
    // console.log(fundIt)
    if (fundIt) {
      return res.send({
        code: -1,
        data: {
          message: '分类已存在',
        },
      })
    }
    const result = await Notice.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加分类成功',
      },
    })
  })
  // 获取公告
  router.get('/notice', authMeddleware, async (req, res) => {
    const totalCount = await Notice.find()
    const data = await Notice.find().sort({ createTime: -1 })
    // console.log(data)
    res.send({
      code: 1,
      data: {
        noticeList: data,
        totalCount: totalCount.length,
      },
    })
  })
  // 编辑公告
  router.patch('/notice/patch/:id', authMeddleware, async (req, res) => {
    const title = await Notice.findOne({ title: req.body.title })
    const result = await Notice.findByIdAndUpdate(req.params.id, req.body)
    res.send({
      code: 1,
      data: {
        message: '更改成功',
      },
    })
  })
  // 公告搜索，分页等功能
  router.post('/notice/list', authMeddleware, async (req, res) => {
    const { offset, size, formData } = req.body
    const skipNumber = (offset - 1) * size
    if (formData.title && formData.content && formData.createTime) {
      const totalCount = await Notice.find({
        title: { $regex: formData.title },
        content: { $regex: formData.content },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      }).sort({ createTime: -1 })
      const userList = await Notice.find({
        title: { $regex: formData.title },
        content: { $regex: formData.content },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .sort({ createTime: -1 })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    if ((formData.title || formData.content) && !formData.createTime) {
      const totalCount = await Notice.find({
        title: { $regex: formData.title },
        content: { $regex: formData.content },
      })
      const userList = await Notice.find({
        title: { $regex: formData.title },
        content: { $regex: formData.content },
      })
        .sort({ createTime: -1 })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }

    if (formData.createTime && !formData.title && !formData.content) {
      const totalCount = await Notice.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const userList = await Notice.find({
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .sort({ createTime: -1 })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          list: userList,
          totalCount: totalCount.length,
        },
      })
    }
    const userList = await Notice.find({})
      .sort({ createTime: -1 })
      .skip(skipNumber)
      .limit(size)
    const totalCount = await Notice.find()
    res.send({
      code: 1,
      data: {
        list: userList,
        totalCount: totalCount.length,
      },
    })
  })
  // 删除公告
  router.delete('/notice/delete/:id', authMeddleware, async (req, res) => {
    const deleteUserResult = Notice.findByIdAndDelete(
      req.params.id,
      (err, docs) => {
        if (err) {
          return res.send({
            code: -1,
            data: {
              message: '删除失败',
            },
          })
        } else {
          return res.send({
            code: 1,
            data: {
              name: docs.name,
              message: '删除成功',
            },
          })
        }
      }
    )
  })

  //################# 收入管理 ###########################
  // 添加收入
  router.post('/income/addincome', authMeddleware, async (req, res) => {
    const result = Income.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加收入成功',
      },
    })
  })

  // 获取收入 + 搜索，分页等功能
  router.post('/income/getincome', authMeddleware, async (req, res) => {
    const { userId, offset, size, formData } = req.body
    // console.log(req.body.formData)
    const skipNumber = (offset - 1) * size

    if (formData.category && !formData.money && !formData.createTime) {
      const totalCount = await Income.find({
        userId: userId,
        category: formData.category,
        remark: { $regex: formData.remark },
      })
      const List = await Income.find({
        userId: userId,
        category: formData.category,
        remark: { $regex: formData.remark },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.money && !formData.category && !formData.createTime) {
      const totalCount = await Income.find({
        userId: userId,
        money: formData.money,
        remark: { $regex: formData.remark },
      })
      const List = await Income.find({
        userId: userId,
        money: formData.money,
        remark: { $regex: formData.remark },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.createTime && !formData.category && !formData.money) {
      const totalCount = await Income.find({
        userId: userId,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const List = await Income.find({
        userId: userId,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.category && formData.money && !formData.createTime) {
      const totalCount = await Income.find({
        userId: userId,
        category: formData.category,
        money: formData.money,
        remark: { $regex: formData.remark },
      })
      const List = await Income.find({
        userId: userId,
        category: formData.category,
        money: formData.money,
        remark: { $regex: formData.remark },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.category && formData.money && formData.createTime) {
      const totalCount = await Income.find({
        userId: userId,
        category: formData.category,
        money: formData.money,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const List = await Income.find({
        userId: userId,
        money: formData.money,
        category: formData.category,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.createTime && formData.category && !formData.money) {
      const totalCount = await Income.find({
        userId: userId,
        category: formData.category,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const List = await Income.find({
        userId: userId,
        category: formData.category,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.money && !formData.category && formData.createTime) {
      const totalCount = await Income.find({
        userId: userId,
        money: formData.money,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const List = await Income.find({
        userId: userId,
        money: formData.money,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    const List = await Income.find({
      userId: userId,
      remark: { $regex: formData.remark },
    })
      .skip(skipNumber)
      .limit(size)
    const totalCount = await Income.find({
      userId: userId,
      remark: { $regex: formData.remark },
    })
    res.send({
      code: 1,
      data: {
        incomeList: List,
        totalCount: totalCount.length,
      },
    })
  })
  // 删除收入信息
  router.delete('/income/delete/:id', authMeddleware, (req, res) => {
    const deleteResult = Income.findByIdAndDelete(
      req.params.id,
      (err, docs) => {
        if (err) {
          return res.send({
            code: -1,
            data: {
              message: '删除失败',
            },
          })
        } else {
          return res.send({
            code: 1,
            data: {
              name: docs.name,
              message: '删除成功',
            },
          })
        }
      }
    )
  })
  // 编辑公告
  router.patch('/income/patchincome/:id', authMeddleware, async (req, res) => {
    const result = await Income.findByIdAndUpdate(req.params.id, req.body)
    res.send({
      code: 1,
      data: {
        message: '更改成功',
      },
    })
  })

  // 图表数据查询
  router.post('/income/chart', authMeddleware, async (req, res) => {
    const { userId, limitNum, createTime } = req.body
    // console.log(createTime)
    if (createTime.length !== 0) {
      const result = await Income.find({
        userId: userId,
        createTime: {
          $gt: createTime[0],
          $lt: createTime[1],
        },
      })
        .sort({ money: -1 })
        .limit(limitNum)

      const ListData = []
      result.forEach((item) => {
        ListData.push({ value: item.money, name: item.category })
      })
      // console.log(ListData)

      return res.send(ListData)
    }
    const result = await Income.find({
      userId: userId,
    })
      .sort({ money: -1 })
      .limit(limitNum)
    const ListData = []
    result.forEach((item) => {
      ListData.push({ value: item.money, name: item.category })
    })
    res.send(ListData)
  })
  // 获取收入一年数据
  router.post('/income/yearchart', authMeddleware, async (req, res) => {
    // console.log(req.body)
    const result = await Income.find({
      userId: req.body.userId,
    })
    const listData = []
    result.forEach((item) => {
      listData.push({ money: item.money, createTime: item.createTime })
    })
    res.send(listData)
  })

  // ############### 支出管理 #################
  // 添加支出
  router.post('/expense/addexpense', authMeddleware, async (req, res) => {
    const result = Expense.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加支出成功',
      },
    })
  })
  // 获取支出 + 搜索，分页等功能
  router.post('/expense/getexpense', authMeddleware, async (req, res) => {
    const { userId, offset, size, formData } = req.body
    console.log(req.body.formData)
    const skipNumber = (offset - 1) * size

    if (formData.category && !formData.money && !formData.createTime) {
      const totalCount = await Expense.find({
        userId: userId,
        category: formData.category,
        remark: { $regex: formData.remark },
      })
      const List = await Expense.find({
        userId: userId,
        category: formData.category,
        remark: { $regex: formData.remark },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.money && !formData.category && !formData.createTime) {
      const totalCount = await Expense.find({
        userId: userId,
        money: formData.money,
        remark: { $regex: formData.remark },
      })
      const List = await Expense.find({
        userId: userId,
        money: formData.money,
        remark: { $regex: formData.remark },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.createTime && !formData.category && !formData.money) {
      const totalCount = await Expense.find({
        userId: userId,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const List = await Expense.find({
        userId: userId,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.category && formData.money && formData.createTime) {
      const totalCount = await Expense.find({
        userId: userId,
        category: formData.category,
        money: formData.money,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const List = await Expense.find({
        userId: userId,
        money: formData.money,
        category: formData.category,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.category && formData.money && !formData.createTime) {
      const totalCount = await Expense.find({
        userId: userId,
        category: formData.category,
        money: formData.money,
        remark: { $regex: formData.remark },
      })
      const List = await Expense.find({
        userId: userId,
        category: formData.category,
        money: formData.money,
        remark: { $regex: formData.remark },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.category && !formData.money && formData.createTime) {
      const totalCount = await Expense.find({
        userId: userId,
        category: formData.category,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const List = await Expense.find({
        userId: userId,
        category: formData.category,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    if (formData.money && !formData.category && formData.createTime) {
      const totalCount = await Expense.find({
        userId: userId,
        money: formData.money,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
      const List = await Expense.find({
        userId: userId,
        money: formData.money,
        remark: { $regex: formData.remark },
        createTime: {
          $gt: formData.createTime[0],
          $lt: formData.createTime[1],
        },
      })
        .skip(skipNumber)
        .limit(size)
      return res.send({
        code: 1,
        data: {
          incomeList: List,
          totalCount: totalCount.length,
        },
      })
    }
    const List = await Expense.find({
      userId: userId,
      remark: { $regex: formData.remark },
    })
      .skip(skipNumber)
      .limit(size)
    const totalCount = await Expense.find({
      userId: userId,
      remark: { $regex: formData.remark },
    })
    res.send({
      code: 1,
      data: {
        incomeList: List,
        totalCount: totalCount.length,
      },
    })
  })
  // 删除支出信息
  router.delete('/expense/delete/:id', authMeddleware, async (req, res) => {
    const deleteResult = Expense.findByIdAndDelete(
      req.params.id,
      (err, docs) => {
        if (err) {
          return res.send({
            code: -1,
            data: {
              message: '删除失败',
            },
          })
        } else {
          return res.send({
            code: 1,
            data: {
              name: docs.name,
              message: '删除成功',
            },
          })
        }
      }
    )
  })
  // 编辑支出
  router.patch(
    '/expense/patchexpense/:id',
    authMeddleware,
    async (req, res) => {
      const result = await Expense.findByIdAndUpdate(req.params.id, req.body)
      res.send({
        code: 1,
        data: {
          message: '更改成功',
        },
      })
    }
  )

  // 支出图表数据查询
  router.post('/expense/chart', authMeddleware, async (req, res) => {
    const { userId, limitNum, createTime } = req.body
    // console.log(createTime)
    if (createTime.length !== 0) {
      const result = await Expense.find({
        userId: userId,
        createTime: {
          $gt: createTime[0],
          $lt: createTime[1],
        },
      })
        .sort({ money: -1 })
        .limit(limitNum)

      const ListData = []
      result.forEach((item) => {
        ListData.push({ value: item.money, name: item.category })
      })
      // console.log(ListData)

      return res.send(ListData)
    }
    const result = await Expense.find({
      userId: userId,
    })
      .sort({ money: -1 })
      .limit(limitNum)
    const ListData = []
    result.forEach((item) => {
      ListData.push({ value: item.money, name: item.category })
    })
    res.send(ListData)
  })
  // 获取支出一年数据
  router.post('/expense/yearchart', authMeddleware, async (req, res) => {
    // console.log(req.body)
    const result = await Expense.find({
      userId: req.body.userId,
    })
    const listData = []
    result.forEach((item) => {
      listData.push({ money: item.money, createTime: item.createTime })
    })
    res.send(listData)
  })

  // ################ 债务 ######################
  // 添加债务
  router.post('/debt/adddebt', authMeddleware, async (req, res) => {
    const result = Debt.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加支出成功',
      },
    })
  })
  // 获取债务 + 搜索，分页等功能
  router.post('/debt/getdebt', authMeddleware, async (req, res) => {
    const { userId, offset, size, formData } = req.body
    const skipNumber = (offset - 1) * size
    console.log(formData)
    if (formData) {
      const totalCount = await Debt.find({
        userId: userId,
        name: { $regex: formData.name },
        remark: { $regex: formData.remark },
      })
      const List = await Debt.find({
        userId: userId,
        name: { $regex: formData.name },
        remark: { $regex: formData.remark },
      })
        .skip(skipNumber)
        .limit(size)
      if (formData.category && !formData.expirationTime && !formData.mark) {
        const totalCount = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
        })
        const List = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (!formData.category && formData.expirationTime && !formData.mark) {
        const totalCount = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          expirationTime: {
            $gt: formData.expirationTime[0],
            $lt: formData.expirationTime[1],
          },
        })
        const List = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          expirationTime: {
            $gt: formData.expirationTime[0],
            $lt: formData.expirationTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (
        formData.mark !== '' &&
        !formData.category &&
        !formData.expirationTime
      ) {
        const totalCount = await Debt.find({
          userId: userId,
          mark: formData.mark,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
        })
        const List = await Debt.find({
          userId: userId,
          mark: formData.mark,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
        })
          .skip(skipNumber)
          .limit(size)
        // console.log(List)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (formData.category && formData.expirationTime && !formData.mark) {
        const totalCount = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          expirationTime: {
            $gt: formData.expirationTime[0],
            $lt: formData.expirationTime[1],
          },
        })
        const List = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          expirationTime: {
            $gt: formData.expirationTime[0],
            $lt: formData.expirationTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (
        formData.category &&
        !formData.expirationTime &&
        formData.mark !== ''
      ) {
        const totalCount = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          mark: formData.mark,
        })
        const List = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          mark: formData.mark,
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (
        !formData.category &&
        formData.expirationTime &&
        formData.mark !== ''
      ) {
        const totalCount = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          mark: formData.mark,
          expirationTime: {
            $gt: formData.expirationTime[0],
            $lt: formData.expirationTime[1],
          },
        })
        const List = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          mark: formData.mark,
          expirationTime: {
            $gt: formData.expirationTime[0],
            $lt: formData.expirationTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (
        formData.category &&
        formData.expirationTime &&
        formData.mark !== ''
      ) {
        const totalCount = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          mark: formData.mark,
          expirationTime: {
            $gt: formData.expirationTime[0],
            $lt: formData.expirationTime[1],
          },
        })
        const List = await Debt.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          mark: formData.mark,
          expirationTime: {
            $gt: formData.expirationTime[0],
            $lt: formData.expirationTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      return res.send({
        code: 1,
        data: {
          list: List,
          totalCount: totalCount.length,
        },
      })
    }
    const List = await Debt.find({ userId: userId })
      .skip(skipNumber)
      .limit(size)
    const totalCount = await Debt.find({ userId: userId })
    res.send({
      code: 1,
      data: {
        list: List,
        totalCount: totalCount.length,
      },
    })
  })
  // 删除债务信息

  router.delete('/debt/delete/:id', authMeddleware, async (req, res) => {
    const deleteResult = Debt.findByIdAndDelete(req.params.id, (err, docs) => {
      if (err) {
        return res.send({
          code: -1,
          data: {
            message: '删除失败',
          },
        })
      } else {
        return res.send({
          code: 1,
          data: {
            name: docs.name,
            message: '删除成功',
          },
        })
      }
    })
  })
  // 编辑债务
  router.patch('/debt/patchdebt/:id', authMeddleware, async (req, res) => {
    const result = await Debt.findByIdAndUpdate(req.params.id, req.body)
    res.send({
      code: 1,
      data: {
        message: '更改成功',
      },
    })
  })

  // 债务图表数据查询
  router.post('/debt/chart', authMeddleware, async (req, res) => {
    const { userId, limitNum, createTime } = req.body
    // console.log(createTime)
    if (createTime.length !== 0) {
      const result = await Debt.find({
        userId: userId,
        createTime: {
          $gt: createTime[0],
          $lt: createTime[1],
        },
      })
        .sort({ money: -1 })
        .limit(limitNum)

      const ListData = []
      result.forEach((item) => {
        ListData.push({ value: item.money, name: item.category })
      })
      // console.log(ListData)

      return res.send(ListData)
    }
    const result = await Debt.find({
      userId: userId,
    })
      .sort({ money: -1 })
      .limit(limitNum)
    const ListData = []
    result.forEach((item) => {
      ListData.push({ value: item.money, name: item.category })
    })
    res.send(ListData)
  })
  // 获取债务一年数据
  router.post('/debt/yearchart', authMeddleware, async (req, res) => {
    const result = await Debt.find({
      userId: req.body.userId,
    })
    const payList = []
    const notPayList = []
    let payNum = 0
    let notPayNum = 0
    result.forEach((item) => {
      if (item.mark === 1) {
        payList.push({ money: item.money, createTime: item.createTime })
      }
      if (item.mark === 2) {
        notPayList.push({ money: item.money, createTime: item.createTime })
      }
    })

    payList.forEach((item) => {
      payNum += item.money
    })
    notPayList.forEach((item) => {
      notPayNum += item.money
    })
    res.send({
      payList: payList,
      notPayList: notPayList,
      payNum: payNum,
      notPayNum: notPayNum,
    })
  })

  // ################ 投资 ######################
  // 添加投资
  router.post('/investment/addinvestment', authMeddleware, async (req, res) => {
    const result = Investment.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加投资成功',
      },
    })
  })
  // 获取投资 + 搜索，分页等功能
  router.post('/investment/getinvestment', authMeddleware, async (req, res) => {
    const { userId, offset, size, formData } = req.body
    const skipNumber = (offset - 1) * size
    if (formData) {
      const totalCount = await Investment.find({
        userId: userId,
        name: { $regex: formData.name },
        remark: { $regex: formData.remark },
      })
      const List = await Investment.find({
        userId: userId,
        name: { $regex: formData.name },
        remark: { $regex: formData.remark },
      })
        .skip(skipNumber)
        .limit(size)
      if (formData.category && !formData.createTime && !formData.money) {
        const totalCount = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
        })
        const List = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (!formData.category && formData.createTime && !formData.mark) {
        const totalCount = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          createTime: {
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
        const List = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          createTime: {
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (formData.money && !formData.category && !formData.createTime) {
        const totalCount = await Investment.find({
          userId: userId,
          money: formData.money,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
        })
        const List = await Investment.find({
          userId: userId,
          money: formData.money,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (formData.category && formData.createTime && !formData.money) {
        const totalCount = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          createTime: {
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
        const List = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          createTime: {
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (formData.category && !formData.expirationTime && formData.money) {
        const totalCount = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          money: formData.money,
        })
        const List = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          money: formData.money,
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (!formData.category && formData.createTime && formData.money) {
        const totalCount = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          money: formData.money,
          createTime: {
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
        const List = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          money: formData.money,
          createTime: {
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      if (formData.category && formData.createTime && formData.money) {
        const totalCount = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          money: formData.money,
          createTime: {
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
        const List = await Investment.find({
          userId: userId,
          name: { $regex: formData.name },
          remark: { $regex: formData.remark },
          category: formData.category,
          money: formData.money,
          createTime: {
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
          .skip(skipNumber)
          .limit(size)
        return res.send({
          code: 1,
          data: {
            list: List,
            totalCount: totalCount.length,
          },
        })
      }
      return res.send({
        code: 1,
        data: {
          list: List,
          totalCount: totalCount.length,
        },
      })
    }
    const List = await Investment.find({ userId: userId })
      .skip(skipNumber)
      .limit(size)
    const totalCount = await Investment.find({ userId: userId })
    res.send({
      code: 1,
      data: {
        list: List,
        totalCount: totalCount.length,
      },
    })
  })
  // 删除债投资信息

  router.delete('/investment/delete/:id', authMeddleware, async (req, res) => {
    const deleteResult = Investment.findByIdAndDelete(
      req.params.id,
      (err, docs) => {
        if (err) {
          return res.send({
            code: -1,
            data: {
              message: '删除失败',
            },
          })
        } else {
          return res.send({
            code: 1,
            data: {
              name: docs.name,
              message: '删除成功',
            },
          })
        }
      }
    )
  })
  // 编辑投资
  router.patch(
    '/investment/patchinvestment/:id',
    authMeddleware,
    async (req, res) => {
      const result = await Investment.findByIdAndUpdate(req.params.id, req.body)
      res.send({
        code: 1,
        data: {
          message: '更改成功',
        },
      })
    }
  )

  // 投资图表数据查询
  router.post('/investment/chart', authMeddleware, async (req, res) => {
    const { userId, limitNum, createTime } = req.body
    // console.log(createTime)
    if (createTime.length !== 0) {
      const result = await Investment.find({
        userId: userId,
        createTime: {
          $gt: createTime[0],
          $lt: createTime[1],
        },
      })
        .sort({ money: -1 })
        .limit(limitNum)

      const ListData = []
      result.forEach((item) => {
        ListData.push({ value: item.money, name: item.category })
      })
      // console.log(ListData)

      return res.send(ListData)
    }
    const result = await Investment.find({
      userId: userId,
    })
      .sort({ money: -1 })
      .limit(limitNum)
    const ListData = []
    result.forEach((item) => {
      ListData.push({ value: item.money, name: item.category })
    })
    res.send(ListData)
  })
  // 获取投资一年数据
  router.post('/investment/yearchart', authMeddleware, async (req, res) => {
    const result = await Investment.find({
      userId: req.body.userId,
    })
    res.send({
      code: 1,
      data: {
        list: result,
      },
    })
  })

  // ################### 首页  #################
  router.get('/home/usernum', authMeddleware, async (req, res) => {
    const result = await Users.find().count()
    res.send({
      code: 1,
      data: {
        userNum: result,
      },
    })
  })
  // 首页获取公告
  router.get('/notice/isShow', authMeddleware, async (req, res) => {
    const totalCount = await Notice.find()
    const data = await Notice.find({ isShow: 1 }).sort({ createTime: -1 })
    res.send({
      code: 1,
      data: {
        noticeList: data,
        totalCount: totalCount.length,
      },
    })
  })
  app.use('/api', router)
}
