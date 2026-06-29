/**
 * CRM Test Platform - API 统一导出
 *
 * 用法：
 *   const { createClient, Auth, AIAgent, Lead, Customer, Opportunity, Quotation, Contract, Approval } = require('../api');
 *
 *   // 在 beforeAll 里创建 client
 *   const client = await createClient(request, { email: '...', password: '...' });
 *
 *   // 调用 API
 *   const res = await Customer.create(client, { customerName: '...', ... });
 *   const body = await res.json();
 */

const { createClient, disposeClient, CRMClient, BASE_URL } = require('./client');
const Auth       = require('./auth');
const AIAgent    = require('./ai-agent');
const Lead       = require('./crm/lead');
const Customer   = require('./crm/customer');
const Opportunity = require('./crm/opportunity');
const Quotation  = require('./crm/quotation');
const Contract   = require('./crm/contract');
const Approval   = require('./crm/approval');

module.exports = {
  // Client 工厂
  createClient,
  disposeClient,
  CRMClient,
  BASE_URL,

  // API 模块
  Auth,
  AIAgent,
  Lead,
  Customer,
  Opportunity,
  Quotation,
  Contract,
  Approval
};
