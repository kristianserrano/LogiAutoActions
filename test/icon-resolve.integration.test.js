const test = require('node:test');
const assert = require('node:assert/strict');

test('icons/resolve resolves by Font Awesome icon name', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/icons/resolve?query=microsoft`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.ok(body.match);
    assert.match(body.match.path, /microsoft\.svg$/i);
    assert.ok(['regular', 'solid', 'brands', 'unknown'].includes(body.match.pack));
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('icons/resolve returns 404 for unknown icon name', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/icons/resolve?query=this-icon-does-not-exist`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.ok, false);
    assert.match(body.error, /No icon found/i);
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});
