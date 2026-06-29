/**
 * 审批流程相关 API
 */

const ApprovalAPI = {
  /**
   * 获取审批表单（轮询直到节点 ready）
   * @param {CRMClient} client - 审批人的 client
   * @param {string|number} flowInstanceId
   * @param {{ maxRetries?: number, interval?: number }} opts
   * @returns {Promise<object|null>} formData 或 null（超时）
   */
  async waitAndGetForm(client, flowInstanceId, opts = {}) {
    const maxRetries = opts.maxRetries ?? 20;
    const interval = opts.interval ?? 5000;

    for (let i = 0; i < maxRetries; i++) {
      await new Promise(r => setTimeout(r, interval));
      const res = await client.get(`/flow/api/flow-instance/${flowInstanceId}/get-form`);
      console.log(`  🔄 第${i + 1}次 get-form，状态: ${res.status()}`);
      if (res.status() === 200) {
        return await res.json();
      }
      const err = await res.text();
      console.log(`     错误: ${err.substring(0, 100)}`);
    }
    return null;
  },

  /**
   * 提交审批
   * @param {CRMClient} approverClient - 审批人的 client
   * @param {string|number} flowInstanceId
   * @param {string} formPbcToken - 表单 PBC Token（如 'quotation-management'）
   * @param {object} formData - get-form 返回的表单数据
   * @param {{ result?: string, comment?: string, extraData?: object }} opts
   */
  async approve(approverClient, flowInstanceId, formPbcToken, formData, opts = {}) {
    return approverClient.put(
      `/flow/api/flow-instance/${flowInstanceId}/approval?formPbcToken=${formPbcToken}`,
      {
        data: {
          formData: {
            ...(formData.data || formData),
            ...opts.extraData,
            flowInstanceId: Number(flowInstanceId),
            threadId: String(flowInstanceId)
          },
          approvalResult: opts.result ?? 'APPROVAL',
          approvalComment: opts.comment ?? '同意'
        }
      }
    );
  },

  /**
   * 等待并完成审批（getForm + approve 的组合）
   * @returns {Promise<boolean>} 审批是否成功
   */
  async waitAndApprove(approverClient, flowInstanceId, formPbcToken, opts = {}) {
    const formData = await ApprovalAPI.waitAndGetForm(approverClient, flowInstanceId, opts);
    if (!formData) {
      console.log(`  ⚠️ 审批表单获取超时，flowInstanceId: ${flowInstanceId}`);
      return false;
    }

    const res = await ApprovalAPI.approve(approverClient, flowInstanceId, formPbcToken, formData, opts);
    if (res.status() === 200) {
      console.log(`  ✅ 审批通过，flowInstanceId: ${flowInstanceId}`);
      return true;
    }
    const err = await res.text();
    console.log(`  ❌ 审批失败 ${res.status()}: ${err.substring(0, 150)}`);
    return false;
  }
};

module.exports = ApprovalAPI;
