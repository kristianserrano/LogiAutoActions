const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createChromeShortcutsTestRequest } = require('../src/sample-requests');
const { validateGeneratorRequest } = require('../src/validate-generator-request');

test('chrome sample request matches golden fixture', () => {
  const expectedPath = path.join(__dirname, 'fixtures', 'chrome-shortcuts.expected.json');
  const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  const actual = createChromeShortcutsTestRequest();

  assert.deepStrictEqual(actual, expected);
});

test('chrome sample request passes contract validation', () => {
  const result = validateGeneratorRequest(createChromeShortcutsTestRequest());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});
