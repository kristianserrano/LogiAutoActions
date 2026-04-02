const test = require('node:test');
const assert = require('node:assert/strict');

const { createChromeShortcutsTestRequest } = require('../src/sample-requests');

async function pollJobUntilDone(baseUrl, jobId) {
  const maxAttempts = 25;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let response;
    let body;
    try {
      response = await fetch(`${baseUrl}/api/generator/mock-build/${jobId}`);
      body = await response.json();
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

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

async function runMockBuildAndWait(baseUrl) {
  const startResponse = await fetch(`${baseUrl}/api/generator/mock-build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createChromeShortcutsTestRequest())
  });

  const startBody = await startResponse.json();
  assert.equal(startResponse.status, 202);
  assert.equal(startBody.ok, true);
  assert.ok(startBody.jobId);

  return pollJobUntilDone(baseUrl, startBody.jobId);
}

test('mock build fails when verifier is unavailable', { concurrency: false }, async () => {
  process.env.LOGI_FORCE_NO_VERIFIER = '1';
  // Ensure server module sees overridden env when diagnostics are computed.
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const terminal = await runMockBuildAndWait(baseUrl);
    assert.equal(terminal.status, 'failed');
    assert.equal(terminal.result.ok, false);
    assert.equal(terminal.result.error.code, 'VERIFY_FAILED');
    assert.equal(terminal.result.error.stage, 'packaging');
    assert.equal(terminal.result.package.verifyPassed, false);
    assert.equal(terminal.result.package.filePath, null);
  } finally {
    delete process.env.LOGI_FORCE_NO_VERIFIER;
    delete process.env.LOGI_MOCK_VERIFY_RESULT;
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('mock build completes when verifier is mocked to pass', { concurrency: false }, async () => {
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

    const terminal = await runMockBuildAndWait(baseUrl);
    assert.equal(terminal.status, 'completed');
    assert.equal(terminal.result.ok, true);
    assert.equal(terminal.result.package.verifyPassed, true);
    assert.match(terminal.result.package.verifyMessage || '', /passed/i);
    assert.ok(terminal.result.package.filePath);
  } finally {
    delete process.env.LOGI_FORCE_NO_VERIFIER;
    delete process.env.LOGI_MOCK_VERIFY_RESULT;
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});
