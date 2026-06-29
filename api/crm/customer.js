/**
 * 客户（Customer）相关 API
 */

const CustomerAPI = {
  /** 创建客户 */
  async create(client, params) {
    return client.post(
      '/form/api/v2/form-entity-data/customer-management/customer-management-form/default',
      { data: params }
    );
  },

  /** 查询客户列表 */
  async list(client, opts = {}) {
    return client.post('/form/api/v3/form-entity-data/customer-management/customer-management-form/list', {
      data: {
        startRow: opts.startRow ?? 0,
        endRow: opts.endRow ?? 20,
        selectColId: opts.selectColId || ['id', 'customerName', 'myOrgId', 'createdTime'],
        filterModel: opts.filterModel || [],
        sortModel: opts.sortModel || [{ colId: 'createdTime', sort: 'desc' }]
      }
    });
  },

  /** 获取客户详情 */
  async get(client, id) {
    return client.get(`/form/api/v2/form-entity-data/customer-management/customer-management-form/${id}`);
  },

  /** 更新客户 */
  async update(client, id, params) {
    return client.put(
      `/form/api/v2/form-entity-data/${id}/customer-management/customer-management-form/edit`,
      { data: params }
    );
  }
};

module.exports = CustomerAPI;
