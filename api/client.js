/**
 * CRM API 基础 Client
 *
 * 封装 baseURL、token 管理、通用请求逻辑。
 * 所有 API 模块通过此 client 发起请求。
 *
 * 用法：
 *   const { createClient } = require('./client');
 *   const client = await createClient(request);  // request 来自 Playwright
 *   // client.token 可以访问当前 token
 */

const BASE_URL = process.env.CRM_BASE_URL || 'https://bot.ceta.crm.duxing.cn';

/**
 * 密码加密（base64 + ROT13-64）
 */
function encryptPassword(plainText) {
  const charMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const encoded = Buffer.from(plainText).toString('base64');
  return encoded.split('').map(char => {
    const index = charMap.indexOf(char);
    return index !== -1 ? charMap[(index + 13) % 64] : char;
  }).join('');
}

class CRMClient {
  constructor(ctx) {
    this._ctx = ctx;   // Playwright APIRequestContext
    this.token = null;
    this.baseURL = BASE_URL;
  }

  /** 带 Auth header 的通用请求选项 */
  _opts(extra = {}) {
    return {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
        ...(extra.headers || {})
      },
      ...extra,
      headers: undefined  // 避免重复，下面重新赋值
    };
  }

  _buildOpts(extraHeaders = {}, rest = {}) {
    return {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
        ...extraHeaders
      },
      ...rest
    };
  }

  async get(path, opts = {}) {
    const { extraHeaders = {}, ...rest } = opts;
    return this._ctx.get(path, this._buildOpts(extraHeaders, rest));
  }

  async post(path, opts = {}) {
    const { extraHeaders = {}, ...rest } = opts;
    return this._ctx.post(path, this._buildOpts(extraHeaders, rest));
  }

  async put(path, opts = {}) {
    const { extraHeaders = {}, ...rest } = opts;
    return this._ctx.put(path, this._buildOpts(extraHeaders, rest));
  }

  async delete(path, opts = {}) {
    const { extraHeaders = {}, ...rest } = opts;
    return this._ctx.delete(path, this._buildOpts(extraHeaders, rest));
  }
}

/**
 * 创建一个已登录的 CRMClient 实例
 * @param {import('@playwright/test').APIRequestContext} request - Playwright request
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<CRMClient>}
 */
async function createClient(request, credentials) {
  const ctx = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  const client = new CRMClient(ctx);

  if (credentials) {
    const res = await ctx.post('/user-management/api/user/login', {
      data: {
        email: credentials.email,
        username: credentials.email,
        password: encryptPassword(credentials.password),
        captcha: ''
      }
    });

    if (res.status() !== 200) {
      const body = await res.text();
      throw new Error(`登录失败 [${res.status()}]: ${body.substring(0, 200)}`);
    }

    const body = await res.json();
    client.token = body.accessToken;
  }

  return client;
}

/**
 * 关闭 client（释放 HTTP 连接）
 */
async function disposeClient(client) {
  if (client && client._ctx) {
    await client._ctx.dispose();
  }
}

module.exports = { CRMClient, createClient, disposeClient, encryptPassword, BASE_URL };
