const test = require('node:test');
const assert = require('node:assert/strict');

async function pollJobUntilDone(baseUrl, jobId) {
  const maxAttempts = 30;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/generator/mock-build/${jobId}`);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.message || 'Failed to poll mock build status.');
    }

    if (body.status === 'completed' || body.status === 'failed') {
      return body;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Timed out waiting for mock build terminal state.');
}

function createApprovalPayload(overrides = {}) {
  return {
    projectName: 'ApprovalFlowPlugin',
    displayName: 'Approval Flow Plugin',
    author: 'LogiAutoActions User',
    version: '1.0.0',
    minimumLoupedeckVersion: '6.0',
    supportedDevices: ['LoupedeckCtFamily'],
    approvalActions: [
      {
        id: 'copy-action',
        name: 'Copy Selection',
        description: 'Copy selected text',
        groupPath: 'Generated',
        actionKind: 'command',
        shortcuts: ['Ctrl+C'],
        states: [],
        behaviorResetOnPress: false,
        approval: 'approved'
      }
    ],
    ...overrides
  };
}

test('build-from-approval blocks when any action is not approved', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const payload = createApprovalPayload({
      approvalActions: [
        {
          id: 'copy-action',
          name: 'Copy Selection',
          description: 'Copy selected text',
          groupPath: 'Generated',
          actionKind: 'command',
          shortcuts: ['Ctrl+C'],
          states: [],
          behaviorResetOnPress: false,
          approval: 'pending'
        }
      ]
    });

    const response = await fetch(`${baseUrl}/api/generator/build-from-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.equal(body.code, 'APPROVAL_REQUIRED');
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('build-from-approval uses edited approved values in action summary', { concurrency: false }, async () => {
  process.env.LOGI_FORCE_NO_VERIFIER = '1';
  process.env.LOGI_MOCK_VERIFY_RESULT = 'pass';
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const payload = createApprovalPayload({
      approvalActions: [
        {
          id: 'copy-action',
          name: 'Copy Final',
          description: 'Copy selected text',
          groupPath: 'Generated',
          actionKind: 'command',
          shortcuts: ['Cmd+C'],
          states: [],
          behaviorResetOnPress: false,
          approval: 'approved'
        }
      ]
    });

    const startResponse = await fetch(`${baseUrl}/api/generator/build-from-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const startBody = await startResponse.json();
    assert.equal(startResponse.status, 202);
    assert.equal(startBody.ok, true);

    const terminal = await pollJobUntilDone(baseUrl, startBody.jobId);
    assert.equal(terminal.status, 'completed');
    assert.equal(terminal.result.ok, true);
    assert.equal(terminal.result.actionSummary[0].name, 'Copy Final');
    assert.deepEqual(terminal.result.actionSummary[0].keyboardShortcuts, ['Cmd+C']);
    assert.ok(
      Array.isArray(terminal.result.generatedFiles) &&
      terminal.result.generatedFiles.some((filePath) => /Application\.cs$/i.test(String(filePath))),
      'Generated source should include a ClientApplication class file.'
    );
  } finally {
    delete process.env.LOGI_FORCE_NO_VERIFIER;
    delete process.env.LOGI_MOCK_VERIFY_RESULT;
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('build-from-approval fails in strict real-build mode when fallback would be used', { concurrency: false }, async () => {
  process.env.LOGI_FORCE_NO_VERIFIER = '1';
  process.env.LOGI_FORCE_NO_REAL_BUILD = '1';
  process.env.LOGI_MOCK_VERIFY_RESULT = 'pass';
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const payload = createApprovalPayload({ requireRealBuildOnly: true });

    const startResponse = await fetch(`${baseUrl}/api/generator/build-from-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const startBody = await startResponse.json();
    assert.equal(startResponse.status, 202);
    assert.equal(startBody.ok, true);

    const terminal = await pollJobUntilDone(baseUrl, startBody.jobId);
    assert.equal(terminal.status, 'failed');
    assert.equal(terminal.result.ok, false);
    assert.equal(terminal.result.error.code, 'REAL_BUILD_REQUIRED');
  } finally {
    delete process.env.LOGI_FORCE_NO_VERIFIER;
    delete process.env.LOGI_FORCE_NO_REAL_BUILD;
    delete process.env.LOGI_MOCK_VERIFY_RESULT;
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('build-from-approval exposes downloadable package when completed', { concurrency: false }, async () => {
  process.env.LOGI_FORCE_NO_VERIFIER = '1';
  process.env.LOGI_MOCK_VERIFY_RESULT = 'pass';
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const startResponse = await fetch(`${baseUrl}/api/generator/build-from-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createApprovalPayload())
    });
    const startBody = await startResponse.json();
    assert.equal(startResponse.status, 202);
    assert.equal(startBody.ok, true);

    const terminal = await pollJobUntilDone(baseUrl, startBody.jobId);
    assert.equal(terminal.status, 'completed');
    assert.equal(terminal.result.ok, true);

    const downloadResponse = await fetch(`${baseUrl}/api/generator/mock-build/${startBody.jobId}/download`);
    assert.equal(downloadResponse.status, 200);

    const contentDisposition = String(downloadResponse.headers.get('content-disposition') || '');
    assert.match(contentDisposition, /attachment/i);
    assert.match(contentDisposition, /\.lplug4/i);

    const bytes = await downloadResponse.arrayBuffer();
    assert.ok(bytes.byteLength > 0);
  } finally {
    delete process.env.LOGI_FORCE_NO_VERIFIER;
    delete process.env.LOGI_MOCK_VERIFY_RESULT;
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('build-from-approval keeps Plugin suffix casing for camelCase projectName', { concurrency: false }, async () => {
  process.env.LOGI_FORCE_NO_VERIFIER = '1';
  process.env.LOGI_MOCK_VERIFY_RESULT = 'pass';
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const payload = createApprovalPayload({
      projectName: 'GoogleKeepPlugin'
    });

    const startResponse = await fetch(`${baseUrl}/api/generator/build-from-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const startBody = await startResponse.json();
    assert.equal(startResponse.status, 202);
    assert.equal(startBody.ok, true);

    const terminal = await pollJobUntilDone(baseUrl, startBody.jobId);
    assert.equal(terminal.status, 'completed');
    assert.equal(terminal.result.ok, true);
    assert.match(String(terminal.result.package.filePath || ''), /GoogleKeepPlugin\.lplug4$/);
  } finally {
    delete process.env.LOGI_FORCE_NO_VERIFIER;
    delete process.env.LOGI_MOCK_VERIFY_RESULT;
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});
