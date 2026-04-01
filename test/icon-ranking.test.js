const test = require('node:test');
const assert = require('node:assert/strict');

const { rankIcons } = require('../src/icon-ranking');

test('rankIcons returns deterministic top icon for matching intent', () => {
  const candidates = [
    { path: 'FontAwesomeFreeRegularIcons/copy.svg', pack: 'regular' },
    { path: 'FontAwesomeFreeSolidIcons/copy.svg', pack: 'solid' },
    { path: 'FontAwesomeFreeBrandsIcons/chrome.svg', pack: 'brands' }
  ];

  const result = rankIcons({
    actionName: 'Copy',
    description: 'Copy selected text',
    actionType: 'command',
    candidates
  });

  assert.equal(result.selected.path, 'FontAwesomeFreeRegularIcons/copy.svg');
  assert.ok(Array.isArray(result.ranked));
  assert.equal(result.ranked.length, 3);
});
