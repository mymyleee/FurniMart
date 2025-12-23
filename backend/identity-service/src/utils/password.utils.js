const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

/**
 * Hash mật khẩu
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * So sánh mật khẩu với hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
