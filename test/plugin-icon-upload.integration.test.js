const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const TRANSPARENT_PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==';

test('plugin-icon/prepare-upload converts image to cached 256x256 png', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/plugin-icon/prepare-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'app-icon.png',
        imageDataUrl: TRANSPARENT_PNG_DATA_URL
      })
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.ok(body.pluginIcon);
    assert.match(String(body.pluginIcon.assetPath || ''), /^artifacts\/_plugin-icon-cache\/icon-upload-.+\.png$/);

    const absoluteAssetPath = path.join(__dirname, '..', body.pluginIcon.assetPath);
    assert.equal(fs.existsSync(absoluteAssetPath), true);
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});
