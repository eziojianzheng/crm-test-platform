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

  _url(path) {
    return this._useAbsoluteUrl ? (this.baseURL + path) : path;
  }

  async get(path, opts = {}) {
    const { extraHeaders = {}, ...rest } = opts;
    return this._ctx.get(this._url(path), this._buildOpts(extraHeaders, rest));
  }

  async post(path, opts = {}) {
    const { extraHeaders = {}, ...rest } = opts;
    return this._ctx.post(this._url(path), this._buildOpts(extraHeaders, rest));
  }

  async put(path, opts = {}) {
    const { extraHeaders = {}, ...rest } = opts;
    return this._ctx.put(this._url(path), this._buildOpts(extraHeaders, rest));
  }

  async delete(path, opts = {}) {
    const { extraHeaders = {}, ...rest } = opts;
    return this._ctx.delete(this._url(path), this._buildOpts(extraHeaders, rest));
  }
}

/**
 * 创建一个已登录的 CRMClient 实例
 * @param {import('@playwright/test').APIRequestContext} request - Playwright 的 request fixture
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<CRMClient>}
 */
async function createClient(request, credentials) {
  // request fixture 本身就是 APIRequestContext，直接用
  // 如果是 APIRequest 对象（有 newContext 方法），则创建新 context
  let ctx;
  let ownCtx = false;
  if (typeof request.newContext === 'function') {
    ctx = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    ownCtx = true;
  } else {
    ctx = request;
  }

  const client = new CRMClient(ctx);
  client._ownCtx = ownCtx;
  // 如果是自己创建的 context（有 baseURL），用相对路径；否则用完整路径
  client._useAbsoluteUrl = !ownCtx;

  if (credentials) {
    const loginUrl = ownCtx
      ? '/user-management/api/user/login'
      : `${BASE_URL}/user-management/api/user/login`;

    const res = await ctx.post(loginUrl, {
      headers: { 'Content-Type': 'application/json' },
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
 * 关闭 client（只释放自己创建的 context）
 */
async function disposeClient(client) {
  if (client && client._ctx && client._ownCtx) {
    await client._ctx.dispose();
  }
}

module.exports = { CRMClient, createClient, disposeClient, encryptPassword, BASE_URL };
