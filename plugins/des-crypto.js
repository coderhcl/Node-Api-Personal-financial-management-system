const crypto = require('crypto')

// DES 加密
function desEncrypt(message, key) {
  const cipher = crypto.createCipheriv('des-cbc', key, key)
  let crypted = cipher.update(message, 'utf8', 'base64')
  crypted += cipher.final('base64')
  return crypted
}

// DES 解密
function desDecrypt(text, key) {
  const cipher = crypto.createDecipheriv('des-cbc', key, key)
  let decrypted = cipher.update(text, 'base64', 'utf8')
  decrypted += cipher.final('utf8')
  return decrypted
}
module.exports = { desEncrypt, desDecrypt }
