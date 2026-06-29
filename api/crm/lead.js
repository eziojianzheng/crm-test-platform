/**
 * 线索（Lead）相关 API
 */

const LeadAPI = {
  /** 查询线索列表 */
  async list(client, opts = {}) {
    return client.post('/form/api/v3/form-entity-data/lead-management/lead-management-form/list', {
      data: {
        startRow: opts.startRow ?? 0,
        endRow: opts.endRow ?? 20,
        selectColId: opts.selectColId || ['id', 'myOrgId', 'myUserId', 'createdTime'],
        filterModel: opts.filterModel || [],
        sortModel: opts.sortModel || [{ colId: 'createdTime', sort: 'desc' }]
      }
    });
  },

  /** 获取线索详情 */
  async get(client, id) {
    return client.get(`/form/api/v2/form-entity-data/lead-management/lead-management-form/${id}`);
  },

  /**
   * 语音文件生成线索（AI）
   * @param {object} voiceRecord - 完整的语音记录对象
   */
  async generateFromVoice(client, voiceRecord) {
    return client.post('/flow/api/flow-rest/meeting-file-to-clue-flow', {
      extraHeaders: { 'accept-language': 'zh-CN' },
      data: voiceRecord
    });
  },

  /**
   * 线索转化为商机
   * @param {object} params - 转化参数
   */
  async convertToOpportunity(client, params) {
    return client.put(
      '/flow/api/v2/flow-definition/lead-management/opportunity-conversion-process-flow/lead-management-form/convert/update-form',
      { data: params }
    );
  }
};

module.exports = LeadAPI;
