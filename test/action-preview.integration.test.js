const test = require('node:test');
const assert = require('node:assert/strict');

test('preview-actions returns class approval cards with developer metadata', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/generator/preview-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionName: 'Clipboard Action',
        actionDescription: 'Clipboard helpers',
        actionType: 'single',
        shortcuts: [
          { shortcut: 'Ctrl+C', context: 'Copy selected text' },
          { shortcut: 'Ctrl+V', context: 'Paste clipboard content' }
        ],
        states: []
      })
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.ok(body.preview);
    assert.ok(Array.isArray(body.preview.actions));
    assert.equal(body.preview.actions.length, 2);

    const first = body.preview.actions[0];
    assert.equal(first.actionKind, 'command');
    assert.ok(first.quickView);
    assert.ok(first.behaviorView);
    assert.ok(first.developerView);
    assert.match(first.developerView.className, /Copy/i);
    assert.match(first.developerView.baseClass, /PluginDynamicCommand/);
    assert.match(first.developerView.code, /class/i);
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('preview-actions deduplicates shortcuts when multiple entries infer the same action name', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/generator/preview-actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionName: 'Google Keep',
        actionDescription: 'Google Keep helpers',
        actionType: 'single',
        shortcuts: [
          { shortcut: 'Esc', context: 'Finish editing and focus the note list' },
          { shortcut: 'Ctrl+Enter', context: 'Finish editing and focus the note list' }
        ],
        states: []
      })
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.preview.actions));
    assert.equal(body.preview.actions.length, 1);
    assert.deepEqual(body.preview.actions[0].quickView.shortcutSummary, ['Esc']);
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});
