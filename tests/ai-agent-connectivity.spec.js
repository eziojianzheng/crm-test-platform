/**
 * AI Agent 连通性测试
 * 验证 CRM 系统 AI Agent 功能是否正常可用
 */

const { test, expect } = require('@playwright/test');
const { createClient, disposeClient, AIAgent, Auth } = require('../api');

const CREDENTIALS = {
  email: 'xuanyu.lu@bizops.com.cn',
  password: 'Test@123456'
};

test.describe.serial('AI Agent 连通性测试', () => {
  let client;
  let agents;
  let sessionId;

  test.beforeAll(async ({ request }) => {
    client = await createClient(request, CREDENTIALS);
    console.log('✅ 登录成功');
  });

  test.afterAll(async () => {
    await disposeClient(client);
  });

  test('1. AI Agent 问候语接口', async () => {
    const res = await AIAgent.getGreeting(client);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.results).toBeDefined();
    console.log('✅ 问候语接口可达，results:', JSON.stringify(body.results).substring(0, 100));
  });

  test('2. 获取 Agent 列表', async () => {
    const res = await AIAgent.getAgentList(client);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.agents).toBeDefined();
    agents = body.agents;
    const count = Array.isArray(agents) ? agents.length : '?';
    console.log(`✅ Agent 列表获取成功，共 ${count} 个 Agent`);
  });

  test('3. 获取 LLM 配置', async () => {
    const res = await AIAgent.getLLMConfig(client);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.llms).toBeDefined();
    const count = Array.isArray(body.llms) ? body.llms.length : '?';
    console.log(`✅ LLM 配置获取成功，共 ${count} 个 LLM`);
  });

  test('4. 创建 Agent Session', async () => {
    const agentId = Array.isArray(agents) && agents.length > 0
      ? (agents[0].id || agents[0].agent_id || '')
      : '';

    const res = await AIAgent.createSession(client, { agentId });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.session_id).toBeTruthy();
    sessionId = body.session_id;
    console.log(`✅ Agent Session 创建成功，session_id: ${sessionId}`);
  });

  test('5. 发送消息（核心连通性）', async () => {
    if (!sessionId) { test.skip(true, '无 session_id'); return; }

    const res = await AIAgent.sendMessage(client, sessionId, { question: 'hello' });
    console.log('发送消息状态:', res.status());
    const body = await res.text();
    console.log('响应:', body.substring(0, 200));

    // 服务在线即通过（< 500）
    expect(res.status()).toBeLessThan(500);
    console.log(`✅ Agent 消息接口可达，状态码: ${res.status()}`);
  });
});
