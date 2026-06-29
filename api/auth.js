/**
 * 认证相关 API
 */

const { encryptPassword } = require('./client');

const AuthAPI = {
  /** 获取登录配置（captchaId 等） */
  async getLoginConfig(client) {
    return client.get('/user-management/api/login/config');
  },

  /** 用户登录，返回 { accessToken, refreshToken } */
  async login(client, email, password) {
    return client.post('/user-management/api/user/login', {
      data: {
        email,
        username: email,
        password: encryptPassword(password),
        captcha: ''
      }
    });
  },

  /** 登出 */
  async logout(client) {
    return client.post('/user-management/api/user/logout', { data: {} });
  },

  /** 获取当前用户信息 */
  async getUserInfo(client) {
    return client.get('/user-management/api/user/get-user-info');
  }
};

module.exports = AuthAPI;
