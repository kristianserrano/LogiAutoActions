const test = require('node:test');
const assert = require('node:assert/strict');

const { validateGeneratorRequest } = require('../src/validate-generator-request');

function createBasePayload() {
  return {
    projectName: 'TestPlugin',
    displayName: 'Test Plugin',
    author: 'Tester',
    version: '1.0.0',
    actions: [
      {
        id: 'toggle_mute',
        name: 'Toggle Mute',
        actionKind: 'toggle',
        intent: {
          states: ['Muted', 'Unmuted']
        }
      }
    ]
  };
}

test('rejects duplicate action ids', () => {
  const payload = createBasePayload();
  payload.actions.push({
    id: 'toggle_mute',
    name: 'Duplicate Toggle',
    actionKind: 'command'
  });

  const result = validateGeneratorRequest(payload);
  assert.equal(result.valid, false);
  assert.match(result.errors.map((item) => item.message).join(' '), /duplicate action id/i);
});

test('rejects invalid toggle states length', () => {
  const payload = createBasePayload();
  payload.actions[0].intent.states = ['Muted', 'Half', 'Unmuted'];

  const result = validateGeneratorRequest(payload);
  assert.equal(result.valid, false);
  assert.match(result.errors.map((item) => item.message).join(' '), /exactly 2 states/i);
});

test('rejects multistate actions with fewer than 3 states', () => {
  const payload = createBasePayload();
  payload.actions[0].actionKind = 'multistate';
  payload.actions[0].intent.states = ['A', 'B'];

  const result = validateGeneratorRequest(payload);
  assert.equal(result.valid, false);
  assert.match(result.errors.map((item) => item.message).join(' '), /at least 3 states/i);
});
