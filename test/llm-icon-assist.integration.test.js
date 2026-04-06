const test = require('node:test');
const assert = require('node:assert/strict');

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
    assert.equal(Object.hasOwn(body.responseTemplate, 'pluginIconUrl'), false);
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
    assert.equal(Object.hasOwn(body, 'pluginIcon'), false);
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
