/**
 * 报价（Quotation）相关 API
 */

const QuotationAPI = {
  /** 创建报价 */
  async create(client, params) {
    return client.put(
      '/flow/api/v2/flow-definition/quotation-management/new-quote-approval-flow/quotation-form/new/update-form',
      { data: params }
    );
  },

  /** 查询报价列表 */
  async list(client, opts = {}) {
    return client.post('/form/api/v3/form-entity-data/quotation-management/quotation-form/list', {
      data: {
        startRow: opts.startRow ?? 0,
        endRow: opts.endRow ?? 20,
        selectColId: opts.selectColId || ['id', 'quoteNumber', 'quoteStatus', 'flowInstanceId', 'threadId'],
        filterModel: opts.filterModel || [],
        sortModel: opts.sortModel || [{ colId: 'createdTime', sort: 'desc' }]
      }
    });
  },

  /** 获取报价详情 */
  async get(client, id) {
    return client.get(`/form/api/v2/form-entity-data/quotation-management/quotation-form/${id}`);
  }
};

module.exports = QuotationAPI;
