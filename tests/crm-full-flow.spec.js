/**
 * CRM 完整销售流程测试
 * 语音线索 → 客户 → 商机 → 报价（审批）→ 赢单（审批）→ 合同生效
 */

const { test, expect } = require('@playwright/test');
const {
  createClient, disposeClient,
  Lead, Customer, Opportunity, Quotation, Contract, Approval
} = require('../api');

// ── 账号配置 ──────────────────────────────────────────────────────────────────
const SALES_REP  = { email: 'xuanyu.lu@bizops.com.cn',  password: 'Test@123456' };
const SALES_MGR  = { email: '593969718@qq.com',          password: '593969718@qq.com' };

// ── 测试数据 ──────────────────────────────────────────────────────────────────
const RUN_ID = `AT_${new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14)}`;
const OPPORTUNITY_NAME = `[自动化]博迈历程-信息化转型_${RUN_ID}`;

// ── 赢单阶段字典对象 ──────────────────────────────────────────────────────────
const WIN_ORDER_STAGE = [{
  pbcToken: 'basic-system-setting', code: 'Winning Orders',
  label_i18n_zh_CN: '赢单', formEntityToken: 'data-dictionary',
  label_i18n_en_US: 'Closed Won', handle: 'opportunityStage-Winning Orders',
  label_i18n_ja_JP: '受注', label: '受注', id: 17211, value: '17211'
}];

test.describe.serial('CRM 完整销售流程', () => {
  let repClient;    // Sales Representative A
  let mgrClient;    // Sales Manager A（审批人）

  let leadId;
  let customerId;
  let opportunityId;
  let quotationId;
  let quotationFlowInstanceId;
  let opportunityFlowInstanceId;
  let contractId;

  // ── 初始化：双账号登录 ──────────────────────────────────────────────────────
  test.beforeAll(async ({ request }) => {
    repClient = await createClient(request, SALES_REP);
    mgrClient = await createClient(request, SALES_MGR);
    console.log(`✅ 双账号登录成功，RunId: ${RUN_ID}`);
  });

  test.afterAll(async () => {
    await disposeClient(repClient);
    await disposeClient(mgrClient);
  });

  // ── 步骤 1：语音线索生成 ────────────────────────────────────────────────────
  test('1. 语音线索生成', async () => {
    const res = await Lead.generateFromVoice(repClient, {
      audioFile: {
        resources: [{ storageId: '5fa51a47-63a8-49c0-8dbc-c32f574de893.mp3', fileName: '20260605204051.mp3', url: '/fss/api/public/tenant/System/persistent/5fa51a47-63a8-49c0-8dbc-c32f574de893.mp3', token: '9d035c4a-311f-4ec9-8226-0db247cf270a_20260605204051.mp3' }],
        value: null
      },
      myOrgId: '14313', myUserId: '10085', id: 24787,
      title: 'Hitachi Cable test', voiceType: 'Meeting', flowInstanceId: null, threadId: null,
      formEntityId: 1236, formEntityName: 'Voice Summary Table Form',
      pbcToken: 'crm', formEntityToken: 'voice-summary-table-form',
      createdTime: '2026-06-25T04:22:28.333+00:00', uploadTime: '2026-06-25 12:22:27',
      uploaderEmail: 'runzhi.zhang@bizops.com.cn', userId: 10077,
      totalDuration: '2672', parallelStreamIndex: 3, objectVersion: 0, deleted: false,
      textFile: { resources: [], value: null },
      transcriptionContent: { longText: '博迈历程信息化转型，具体规划如下', value: null }
    });
    expect(res.status()).toBe(200);

    // 等待异步生成后查询
    await new Promise(r => setTimeout(r, 3000));
    const listRes = await Lead.list(repClient);
    expect(listRes.status()).toBe(200);
    const body = await listRes.json();
    const latest = body.results?.[0];
    if (latest) {
      leadId = latest.id;
      console.log(`✅ 线索生成成功，id: ${leadId}`);
    }
  });

  // ── 步骤 2：创建客户档案 ────────────────────────────────────────────────────
  test('2. 创建客户档案', async () => {
    const res = await Customer.create(repClient, {
      customerName: `[自动化]博迈历程_${RUN_ID}`,
      region: '华南',
      customerOwner: [{ value: '10084', label: 'Sales Representative A', uid: '10084' }],
      creator: '10084', myUserId: '10084', myOrgId: '14329'
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    customerId = body.id;
    expect(customerId).toBeTruthy();
    console.log(`✅ 客户创建成功，id: ${customerId}，名称: ${body.customerName}`);
  });

  // ── 步骤 3：线索转化为商机 ──────────────────────────────────────────────────
  test('3. 线索转化为商机', async () => {
    const res = await Lead.convertToOpportunity(repClient, {
      convertToOpportunity: 'true',
      myOrgId: '14329', myUserId: '10084',
      opportunityName: OPPORTUNITY_NAME,
      expectedAmount: '1200', winRate: 56,
      expectedDealTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      companyName: [{ pbcToken: 'customer-management', formEntityToken: 'customer-management-form', label: `[自动化]博迈历程_${RUN_ID}`, value: String(customerId) }],
      opportunityOwner: [{ pbcToken: 'user-management-new', uid: '10084', formEntityToken: 'system-user-form', label: 'Sales Representative A', value: '10084' }],
      id: leadId, leadName: OPPORTUNITY_NAME,
      leadOwner: [{ pbcToken: 'user-management-new', uid: '10084', formEntityToken: 'system-user-form', label: 'Sales Representative A', value: 'xuanyu.lu@bizops.com.cn' }],
      leadScoringBudget: '25', leadScoringNeed: '25', leadScoringAuthority: '25', leadScoringTimeline: '10', leadScoring: '85',
      spinCorrectionDetails: { longText: '', value: '' }, flowInstanceId: null, threadId: null
    });
    expect(res.status()).toBe(200);

    // 查询真实商机 ID
    await new Promise(r => setTimeout(r, 2000));
    const listRes = await Opportunity.list(repClient, {
      filterModel: [{ colId: 'opportunityName', filterType: 'text', type: 'equals', filter: OPPORTUNITY_NAME }]
    });
    const body = await listRes.json();
    const latest = body.results?.[0];
    opportunityId = latest?.id;
    expect(opportunityId).toBeTruthy();
    console.log(`✅ 商机创建成功，id: ${opportunityId}，名称: ${OPPORTUNITY_NAME}`);
  });

  // ── 步骤 4：创建销售报价 ────────────────────────────────────────────────────
  test('4. 创建销售报价', async () => {
    const res = await Quotation.create(repClient, {
      quoteStatus: [{ id: 14413, handle: 'quoteStatus-draft', code: 'draft', label: '草稿', value: 14413 }],
      quoteNumber: `QM-${RUN_ID}`,
      discountOffer: 0, taxRate: null,
      totalPriceNoTax: 3576, totalPriceWithTax: 3576,
      language: 'zh-CN',
      quoteDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      myOrgId: '14329', myUserId: '10084',
      businessOpportunity: [{ id: opportunityId, value: String(opportunityId), label: OPPORTUNITY_NAME, settlementCurrency: [] }],
      parentDataId: String(opportunityId),
      customerName: [{ pbcToken: 'customer-management', formEntityToken: 'customer-management-form', label: `[自动化]博迈历程_${RUN_ID}`, value: String(customerId) }],
      salesPerson: [{ id: 51, value: 'xuanyu.lu@bizops.com.cn', label: 'Sales Representative A', uid: '10084' }],
      productSubtable: {
        inserted: [{
          productName: [{ value: 'CetaCRM', label: 'CetaCRM' }],
          standardPrice: 1788, minimumOrderQuantity: 2,
          currency: [{ value: 'CNY', label: '人民币' }],
          billingCycle: [{ value: 'yearly', label: '按年' }],
          taxRate: null, discountOffer: 0, totalPrice: 3576
        }],
        updated: [], deleted: []
      }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    quotationId = body.formEntityDataId;

    // 获取 flowInstanceId
    await new Promise(r => setTimeout(r, 1000));
    const detail = await (await Quotation.get(repClient, quotationId)).json();
    quotationFlowInstanceId = detail.flowInstanceId || detail.threadId;
    expect(quotationId).toBeTruthy();
    console.log(`✅ 报价创建成功，id: ${quotationId}，编号: QM-${RUN_ID}，flowInstanceId: ${quotationFlowInstanceId}`);
  });

  // ── 步骤 5：报价审批 ────────────────────────────────────────────────────────
  test('5. 报价审批（Sales Manager A）', async () => {
    const approved = await Approval.waitAndApprove(
      mgrClient, quotationFlowInstanceId, 'quotation-management',
      { comment: 'agree' }
    );
    expect(approved).toBe(true);

    // 确认状态变为 accepted
    await new Promise(r => setTimeout(r, 2000));
    const detail = await (await Quotation.get(repClient, quotationId)).json();
    const status = detail.quoteStatus?.[0]?.code;
    expect(status).toBe('accepted');
    console.log('✅ 报价审批通过，状态: accepted');
  });

  // ── 步骤 6：商机推进到赢单 ──────────────────────────────────────────────────
  test('6. 商机推进到赢单', async () => {
    const res = await Opportunity.transitionStage(repClient, opportunityId, WIN_ORDER_STAGE);
    expect(res.status()).toBe(200);
    console.log('✅ 商机已推进到赢单状态');
  });

  // ── 步骤 7：赢单审批 ────────────────────────────────────────────────────────
  test('7. 赢单审批（Sales Manager A）', async () => {
    // 轮询等待 flowInstanceId 生成
    let flowId = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const detail = await (await Opportunity.get(repClient, opportunityId)).json();
      flowId = detail.threadId || detail.flowInstanceId;
      if (flowId) { console.log(`✅ 发现 flowInstanceId: ${flowId}`); break; }
      console.log(`  🔄 第${i + 1}次查询，flowInstanceId 还未生成`);
    }

    const approved = await Approval.waitAndApprove(
      mgrClient, flowId, 'opportunity-management',
      {
        extraData: { opportunityStage: WIN_ORDER_STAGE },
        comment: '同意'
      }
    );
    expect(approved).toBe(true);
    opportunityFlowInstanceId = flowId;

    // 确认商机阶段变为 Winning Orders
    await new Promise(r => setTimeout(r, 3000));
    const detail = await (await Opportunity.get(repClient, opportunityId)).json();
    expect(detail.opportunityStage?.[0]?.code).toBe('Winning Orders');
    console.log('✅ 赢单审批通过，商机阶段: Winning Orders');
  });

  // ── 步骤 8：生成销售合同 ────────────────────────────────────────────────────
  test('8. 生成销售合同', async () => {
    const opp = await (await Opportunity.get(repClient, opportunityId)).json();
    const res = await Opportunity.convertToContract(repClient, {
      ...opp,
      myOrgId: '14329', myUserId: '10084',
      creationTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
      flowInstanceId: opportunityFlowInstanceId,
      threadId: String(opportunityFlowInstanceId),
      contractNumber: `[自动化]CN-${RUN_ID}`,
      Status: 'winning-order-approved'
    });
    expect(res.status()).toBe(200);

    // 查询合同
    await new Promise(r => setTimeout(r, 5000));
    const listRes = await Contract.list(repClient, {
      filterModel: [{ colId: 'contractCode', filterType: 'text', type: 'equals', filter: `[自动化]CN-${RUN_ID}` }]
    });
    const body = await listRes.json();
    let latest = body.results?.[0];
    if (!latest) {
      // 兜底取最新
      const fallback = await Contract.list(repClient, { sortModel: [{ colId: 'createdTime', sort: 'desc' }] });
      const fb = await fallback.json();
      latest = fb.results?.[0];
    }
    contractId = latest?.id;
    expect(contractId).toBeTruthy();
    console.log(`✅ 合同生成成功，id: ${contractId}，名称: ${latest?.contractName}`);
  });

  // ── 步骤 9：完善合同信息 ────────────────────────────────────────────────────
  test('9. 完善合同信息', async () => {
    const contract = await (await Contract.get(repClient, contractId)).json();
    const res = await Contract.update(repClient, contractId, {
      ...contract,
      partyBName: `[自动化]博迈历程乙方_${RUN_ID}`,
      contractLevel: [{ id: 14380, value: 14380, label: '重要合同', 'label_i18n_zh-CN': '重要合同' }],
      signingDate: new Date().toISOString().split('T')[0],
      totalAmountWithTax: 3576, collectionAmount: 3576, receivedAmount: 0,
      paymentProgress: '0%',
      approvalDocument: { resources: { tempResources: [], unmodifiedResources: [], copyOf: [], orders: [] } },
      contractDocument: { resources: { tempResources: [], unmodifiedResources: [], copyOf: [], orders: [] } },
      receivablePlan: { inserted: [], updated: [], deleted: [] }
    });
    expect(res.status()).toBe(200);
    console.log('✅ 合同信息完善成功');
  });

  // ── 步骤 10：合同生效 ───────────────────────────────────────────────────────
  test('10. 合同生效', async () => {
    const res = await Contract.makeEffective(repClient, contractId);
    expect(res.status()).toBe(200);

    // 确认状态变为 effective
    await new Promise(r => setTimeout(r, 2000));
    const detail = await (await Contract.get(repClient, contractId)).json();
    const status = detail.contractStatus?.[0]?.code;
    expect(status).toBe('effective');
    console.log('🎉 合同已生效！整个 CRM 销售流程完成');
  });
});
