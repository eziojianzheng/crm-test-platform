/**
 * AI Agent 相关 API
 */

const AIAgentAPI = {
  /** 获取问候语 */
  async getGreeting(client) {
    return client.get('/flow/api/flow-rest/general-ai-agent/greeting');
  },

  /** 获取 Agent 列表 */
  async getAgentList(client) {
    return client.get('/flow/api/flow-rest/ceta-agent/agent-list');
  },

  /** 获取当前 LLM 配置 */
  async getLLMConfig(client) {
    return client.get('/flow/api/flow-rest/system-get-current-agent-session-llm');
  },

  /** 获取当前用户的 Agent Session 列表 */
  async getSessionUser(client) {
    return client.get('/flow/api/flow-rest/ceta-agent/session/user');
  },

  /**
   * 创建 Agent Session
   * @param {{ agentId?: number|string, model?: object|string, skill?: object|null }} opts
   */
  async createSession(client, opts = {}) {
    return client.post('/flow/api/flow-rest/ceta-agent/session', {
      data: {
        agent_id: opts.agentId || '',
        model: opts.model || '',
        skill: opts.skill ?? null
      }
    });
  },

  /**
   * 向 Agent Session 发送消息
   * @param {string} sessionId
   * @param {{ question: string, model?: object, systemPromptId?: number, skill?: null }} opts
   */
  async sendMessage(client, sessionId, opts = {}) {
    return client.post(`/ac/api/v1/project/agent/session/${sessionId}`, {
      data: {
        question: opts.question || '',
        user_context: opts.userContext ?? null,
        system_prompt_id: opts.systemPromptId ?? null,
        model: opts.model ?? null,
        skill: opts.skill ?? null
      }
    });
  }
};

module.exports = AIAgentAPI;
