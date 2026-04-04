const test = require('node:test');
const assert = require('node:assert/strict');

const TEST_PLUGIN_ICON_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==';

function createApprovalActions() {
  return [
    {
      id: 'next-note',
      name: 'Next note',
      description: 'Move to next note',
      groupPath: 'Generated',
      actionKind: 'command',
      shortcuts: ['J'],
      states: [],
      behaviorResetOnPress: false,
      approval: 'approved'
    },
    {
      id: 'previous-note',
      name: 'Previous note',
      description: 'Move to previous note',
      groupPath: 'Generated',
      actionKind: 'command',
      shortcuts: ['K'],
      states: [],
      behaviorResetOnPress: false,
      approval: 'approved'
    }
  ];
}

test('icons/llm/export-prompt returns prompt and template', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/icons/llm/export-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalActions: createApprovalActions() })
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.actions));
    assert.equal(body.actions.length, 2);
    assert.match(body.promptMarkdown, /JSON Schema/i);
    assert.ok(body.responseTemplate);
    assert.equal(typeof body.responseTemplate.pluginIconUrl, 'string');
    assert.ok(Array.isArray(body.responseTemplate.assignments));
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('icons/llm/validate-import rejects missing action assignments', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/icons/llm/validate-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalActions: createApprovalActions(),
        llmResponse: {
          pluginIconUrl: TEST_PLUGIN_ICON_DATA_URL,
          assignments: [
            {
              actionId: 'next-note',
              icon: 'arrow-right',
              pack: 'solid'
            }
          ]
        }
      })
    });

    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.ok(Array.isArray(body.errors));
    assert.match(body.errors.map((item) => item.message).join(' | '), /Missing assignment/i);
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('icons/llm/validate-import resolves valid assignments', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const response = await fetch(`${baseUrl}/api/icons/llm/validate-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalActions: createApprovalActions(),
        llmResponse: {
          pluginIconUrl: TEST_PLUGIN_ICON_DATA_URL,
          assignments: [
            {
              actionId: 'next-note',
              icon: 'arrow-right',
              pack: 'solid'
            },
            {
              actionId: 'previous-note',
              icon: 'arrow-left',
              pack: 'solid'
            }
          ]
        }
      })
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.ok(Array.isArray(body.resolvedAssignments));
    assert.equal(body.resolvedAssignments.length, 2);
    assert.ok(body.pluginIcon);
    assert.match(String(body.pluginIcon.assetPath || ''), /^artifacts\/_plugin-icon-cache\/.+\.png$/);
    const ids = body.resolvedAssignments.map((item) => item.actionId);
    assert.deepEqual(new Set(ids).size, 2);
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('icons/llm/validate-import accepts JSON wrapped with extra prose', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const wrappedResponse = [
      'Here is the icon mapping you asked for:',
      '{',
      `  "pluginIconUrl": "${TEST_PLUGIN_ICON_DATA_URL}",`,
      '  "assignments": [',
      '    { "actionId": "next-note", "icon": "arrow-right", "pack": "solid" },',
      '    { "actionId": "previous-note", "icon": "arrow-left", "pack": "solid" }',
      '  ]',
      '}',
      'Thanks!'
    ].join('\n');

    const response = await fetch(`${baseUrl}/api/icons/llm/validate-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalActions: createApprovalActions(),
        llmResponse: wrappedResponse
      })
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.resolvedAssignments.length, 2);
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('icons/llm/validate-import accepts markdown-formatted pluginIconUrl from LLM', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const searchWrapped = `https://www.google.com/search?q=${encodeURIComponent(TEST_PLUGIN_ICON_DATA_URL)}`;
    const markdownWrappedIcon = `[${TEST_PLUGIN_ICON_DATA_URL}](${searchWrapped})`;

    const response = await fetch(`${baseUrl}/api/icons/llm/validate-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalActions: createApprovalActions(),
        llmResponse: {
          pluginIconUrl: markdownWrappedIcon,
          assignments: [
            {
              actionId: 'next-note',
              icon: 'arrow-right',
              pack: 'solid'
            },
            {
              actionId: 'previous-note',
              icon: 'arrow-left',
              pack: 'solid'
            }
          ]
        }
      })
    });

    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.ok(body.pluginIcon);
    assert.equal(String(body.pluginIcon.sourceUrl || ''), TEST_PLUGIN_ICON_DATA_URL);
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});

test('icons/llm/validate-import rejects non-official svg icon-library pluginIconUrl', { concurrency: false }, async () => {
  delete require.cache[require.resolve('../server')];
  const { startServer, stopServer } = require('../server');

  let server;
  try {
    server = await startServer({ port: 0, host: '127.0.0.1' });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    const markdownSvg = '[https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/note-sticky.svg](https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/note-sticky.svg)';

    const response = await fetch(`${baseUrl}/api/icons/llm/validate-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalActions: createApprovalActions(),
        llmResponse: {
          pluginIconUrl: markdownSvg,
          assignments: [
            {
              actionId: 'next-note',
              icon: 'arrow-right',
              pack: 'solid'
            },
            {
              actionId: 'previous-note',
              icon: 'arrow-left',
              pack: 'solid'
            }
          ]
        }
      })
    });

    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    const messageText = body.errors.map((item) => item.message).join(' | ');
    assert.match(messageText, /official app icon source|direct \.png/i);
  } finally {
    delete require.cache[require.resolve('../server')];
    if (server) {
      await stopServer();
    }
  }
});
