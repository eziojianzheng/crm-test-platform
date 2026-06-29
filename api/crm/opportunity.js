/**
 * 商机（Opportunity）相关 API
 */

const OpportunityAPI = {
  /** 查询商机列表 */
  async list(client, opts = {}) {
    return client.post('/form/api/v3/form-entity-data/opportunity-management/opportunity-management-form/list', {
      data: {
        startRow: opts.startRow ?? 0,
        endRow: opts.endRow ?? 20,
        selectColId: opts.selectColId || ['id', 'opportunityName', 'myOrgId', 'myUserId', 'createdTime'],
        filterModel: opts.filterModel || [],
        sortModel: opts.sortModel || [{ colId: 'createdTime', sort: 'desc' }]
      }
    });
  },

  /** 获取商机详情 */
  async get(client, id) {
    return client.get(`/form/api/v2/form-entity-data/opportunity-management/opportunity-management-form/${id}`);
  },

  /**
   * 推进商机阶段
   * @param {number|string} id - 商机 ID
   * @param {object[]} opportunityStage - 阶段对象数组
   */
  async transitionStage(client, id, opportunityStage) {
    return client.post('/flow/api/flow-rest/opportunity-stage-transition-process-flow', {
      data: { id, opportunityStage }
    });
  },

  /** 转化为销售合同 */
  async convertToContract(client, params) {
    return client.post('/flow/api/flow-rest/convert-to-sales-contract-flow', { data: params });
  }
};

module.exports = OpportunityAPI;
