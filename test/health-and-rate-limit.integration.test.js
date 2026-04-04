const test = require('node:test');
const assert = require('node:assert/strict');

function setEnv(name, value) {
  const previous = process.env[name];
  if (typeof value === 'undefined') {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  return previous;
}

test('health endpoint returns ok payload', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'logi-auto-actions');
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('api rate limiter returns 429 after configured threshold', { concurrency: false }, async () => {
  const previousMax = setEnv('LOGI_RATE_LIMIT_MAX_REQUESTS', '2');
  const previousWindow = setEnv('LOGI_RATE_LIMIT_WINDOW_MS', '60000');

  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const first = await fetch(`${baseUrl}/api/icons/catalog`);
    const second = await fetch(`${baseUrl}/api/icons/catalog`);
    const third = await fetch(`${baseUrl}/api/icons/catalog`);
    const thirdBody = await third.json();

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 429);
    assert.equal(thirdBody.ok, false);
    assert.equal(thirdBody.code, 'RATE_LIMITED');
  } finally {
    if (server) {
      await stopServer();
    }
    delete require.cache[require.resolve('../server')];
    setEnv('LOGI_RATE_LIMIT_MAX_REQUESTS', previousMax);
    setEnv('LOGI_RATE_LIMIT_WINDOW_MS', previousWindow);
  }
});
