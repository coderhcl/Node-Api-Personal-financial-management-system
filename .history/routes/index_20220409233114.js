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
          message: '注册且登录成功',
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

  // 获取用户列表、按要求查询、分页
  router.post('/users/list', async (req, res) => {
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
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
        const userList = await Users.find({
          name: { $regex: formData.name },
          phone: { $regex: formData.phone },
          email: { $regex: formData.email },
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
      if (formData.roleId && formData.createTime) {
        const totalCount = await Users.find({
          name: { $regex: formData.name },
          phone: { $regex: formData.phone },
          email: { $regex: formData.email },
          roleId: formData.roleId,
          createTime: {
            $gt: formData.createTime[0],
            $lt: formData.createTime[1],
          },
        })
        const userList = await Users.find({
          name: { $regex: formData.name },
          phone: { $regex: formData.phone },
          email: { $regex: formData.email },
          roleId: formData.roleId,
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
  router.post('/addUser', async (req, res) => {
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
  router.patch('/patchUser/:id', async (req, res) => {
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
    if (result)
      res.send({
        code: 1,
        data: {
          message: '修改成功',
        },
      })
  })
  // 删除用户
  router.delete('/deleteUser/:id', (req, res) => {
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
  router.post('/income/category', async (req, res) => {
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
  router.get('/income/category', async (req, res) => {
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
  router.patch('/income/patchCategory/:id', async (req, res) => {
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
  })
  // 收入搜索，分页等功能
  router.post('/income/category/list', async (req, res) => {
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
  router.delete('/income/deleteCategory/:id', (req, res) => {
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
  })

  // ############支出分类################
  // 添加支出分类
  router.post('/expense/category', async (req, res) => {
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
  router.get('/expense/category', async (req, res) => {
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
  router.patch('/expense/patchCategory/:id', async (req, res) => {
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
  })
  // 支出搜索，分页等功能
  router.post('/expense/category/list', async (req, res) => {
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
  router.delete('/expense/deleteCategory/:id', (req, res) => {
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
  router.post('/investment/category', async (req, res) => {
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
  router.get('/investment/category', async (req, res) => {
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
  router.patch('/investment/patchCategory/:id', async (req, res) => {
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
  })
  // 投资搜索，分页等功能
  router.post('/investment/category/list', async (req, res) => {
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
  router.delete('/investment/deleteCategory/:id', (req, res) => {
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
  })

  // ############债务分类################
  // 添加债务分类
  router.post('/debt/category', async (req, res) => {
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
  router.get('/debt/category', async (req, res) => {
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
  router.patch('/debt/patchCategory/:id', async (req, res) => {
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
  router.post('/debt/category/list', async (req, res) => {
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
  router.delete('/debt/deleteCategory/:id', (req, res) => {
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
  })

  // ############公告################
  // 添加公告
  router.post('/notice', async (req, res) => {
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
  router.get('/notice', async (req, res) => {
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
  router.patch('/notice/patch/:id', async (req, res) => {
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
  router.post('/notice/list', async (req, res) => {
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
      })
      const userList = await Notice.find({
        title: { $regex: formData.title },
        content: { $regex: formData.content },
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
    if ((formData.title || formData.content) && !formData.createTime) {
      const totalCount = await Notice.find({
        title: { $regex: formData.title },
        content: { $regex: formData.content },
      })
      const userList = await Notice.find({
        title: { $regex: formData.title },
        content: { $regex: formData.content },
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
    const userList = await Notice.find({}).skip(skipNumber).limit(size)
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
  router.delete('/notice/delete/:id', (req, res) => {
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
  router.post('/income/addincome', (req, res) => {
    const result = Income.create(req.body)
    res.send({
      code: 1,
      data: {
        message: '添加收入成功',
      },
    })
  })
  // 获取收入
  router.post('/income/getincome', (req, res) => {
    console.log(req.body)
    const result = Income.find({ userId:623dd0c82b1d4d8925c33cf2 })
    console.log(result)

    res.send({
      code: 1,
      data: {
        incomeList: result,
        message: '获取成功',
      },
    })
  })
  app.use('/api', router)
}
