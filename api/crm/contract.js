/**
 * 合同（Contract）相关 API
 */

const ContractAPI = {
  /** 查询合同列表 */
  async list(client, opts = {}) {
    return client.post('/form/api/v3/form-entity-data/contract-management/contract-management-form/list', {
      data: {
        startRow: opts.startRow ?? 0,
        endRow: opts.endRow ?? 20,
        selectColId: opts.selectColId || ['id', 'contractCode', 'contractName', 'contractStatus', 'relatedOpportunity', 'createdTime'],
        filterModel: opts.filterModel || [],
        sortModel: opts.sortModel || [{ colId: 'createdTime', sort: 'desc' }]
      }
    });
  },

  /** 获取合同详情 */
  async get(client, id) {
    return client.get(`/form/api/v2/form-entity-data/contract-management/contract-management-form/${id}`);
  },

  /** 完善合同信息 */
  async update(client, id, params) {
    return client.put(
      `/form/api/v2/form-entity-data/${id}/contract-management/contract-management-form/edit`,
      { data: params }
    );
  },

  /** 合同生效 */
  async makeEffective(client, id) {
    return client.post('/flow/api/flow-rest/contract-effective-flow', {
      data: { id }
    });
  }
};

module.exports = ContractAPI;
