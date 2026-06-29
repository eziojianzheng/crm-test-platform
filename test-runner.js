const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

const RUN_HISTORY_FILE = path.join(__dirname, 'run-history.json');
// 使用本平台自己的 node_modules，不依赖 ui-recorder-electron
const PLAYWRIGHT_CLI = path.join(__dirname, 'node_modules', '@playwright', 'test', 'cli.js');
const PLAYWRIGHT_CONFIG = path.join(__dirname, 'playwright.config.js');

// testcase 定义
const TESTCASES = {
  'crm-full-flow': {
    id: 'crm-full-flow',
    name: 'CRM 完整销售流程',
    description: '语音线索 → 客户 → 商机 → 报价（审批）→ 赢单（审批）→ 合同生效',
    steps: 10,
    specFile: path.join(__dirname, 'tests', 'crm-full-flow.spec.js'),
    grep: 'CRM 完整销售流程'
  },
  'ai-agent-connectivity': {
    id: 'ai-agent-connectivity',
    name: 'AI Agent 连通性',
    description: '验证 CRM AI Agent 服务是否正常可达：问候语、Agent 列表、LLM 配置、Session 创建、消息发送',
    steps: 5,
    specFile: path.join(__dirname, 'tests', 'ai-agent-connectivity.spec.js'),
    grep: 'AI Agent 连通性测试'
  }
};

// 事件总线，用于向 SSE 客户端推送日志
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

// 当前是否正在运行
let isRunning = false;
let currentRunId = null;

function loadHistory() {
  if (!fs.existsSync(RUN_HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(RUN_HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveHistory(history) {
  fs.writeFileSync(RUN_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

function getHistory() {
  return loadHistory();
}

function createRun(testcaseId) {
  const runId = `run_${Date.now()}`;
  const run = {
    id: runId,
    testcaseId: testcaseId || 'all',
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'running',
    duration: null,
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    logs: []
  };
  const history = loadHistory();
  history.unshift(run);
  saveHistory(history);
  return runId;
}

function updateRun(runId, updates) {
  const history = loadHistory();
  const idx = history.findIndex(r => r.id === runId);
  if (idx !== -1) {
    Object.assign(history[idx], updates);
    saveHistory(history);
  }
}

function appendLog(runId, line) {
  const history = loadHistory();
  const idx = history.findIndex(r => r.id === runId);
  if (idx !== -1) {
    history[idx].logs.push(line);
    saveHistory(history);
  }
  // 推送到 SSE 客户端
  emitter.emit('log', { runId, line });
}

function parseStats(logs) {
  let total = 0, passed = 0, failed = 0, skipped = 0;
  for (const line of logs) {
    // 匹配 playwright 汇总行：e.g. "  12 passed (1.5m)"
    const m = line.match(/(\d+) passed/);
    if (m) passed = parseInt(m[1]);
    const mf = line.match(/(\d+) failed/);
    if (mf) failed = parseInt(mf[1]);
    const ms = line.match(/(\d+) skipped/);
    if (ms) skipped = parseInt(ms[1]);
  }
  total = passed + failed + skipped;
  return { total, passed, failed, skipped };
}

function runTests(testcaseId) {
  if (isRunning) {
    return { error: '已有测试在运行中，请等待完成' };
  }

  isRunning = true;
  const runId = createRun(testcaseId);
  currentRunId = runId;

  const startTs = Date.now();
  const env = { ...process.env };

  // 根据 testcaseId 决定运行哪个 spec 文件，用 --grep 过滤测试名
  const tc = testcaseId && TESTCASES[testcaseId];
  const args = tc
    ? [PLAYWRIGHT_CLI, 'test', '--reporter=list', '--config', PLAYWRIGHT_CONFIG, '--grep', tc.grep]
    : [PLAYWRIGHT_CLI, 'test', '--reporter=list', '--config', PLAYWRIGHT_CONFIG];

  console.log(`[runner] testcase: ${testcaseId || 'all'}`);
  console.log('[runner] args:', args.join(' '));

  const child = spawn(process.execPath, args, { cwd: __dirname, env, windowsHide: true });

  const pushLine = (line) => {
    if (!line.trim()) return;
    appendLog(runId, line);
  };

  let stdoutBuf = '';
  child.stdout.on('data', (data) => {
    stdoutBuf += data.toString();
    const lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop();
    lines.forEach(pushLine);
  });

  let stderrBuf = '';
  child.stderr.on('data', (data) => {
    stderrBuf += data.toString();
    const lines = stderrBuf.split('\n');
    stderrBuf = lines.pop();
    lines.forEach(l => pushLine(`[stderr] ${l}`));
  });

  child.on('close', (code) => {
    if (stdoutBuf.trim()) pushLine(stdoutBuf);
    if (stderrBuf.trim()) pushLine(`[stderr] ${stderrBuf}`);

    const duration = ((Date.now() - startTs) / 1000).toFixed(1);
    const history = loadHistory();
    const run = history.find(r => r.id === runId);
    const stats = parseStats(run ? run.logs : []);

    const status = stats.failed > 0 ? 'failed' : (code === 0 ? 'passed' : 'failed');

    updateRun(runId, {
      endTime: new Date().toISOString(),
      status,
      duration: `${duration}s`,
      ...stats
    });

    emitter.emit('done', { runId, status, duration, ...stats });
    isRunning = false;
    currentRunId = null;
  });

  return { runId };
}

module.exports = { runTests, getHistory, isRunning: () => isRunning, currentRunId: () => currentRunId, emitter, TESTCASES };
