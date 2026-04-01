const test = require('node:test');
const assert = require('node:assert/strict');

const { verifyLplug4Package } = require('../src/package-verification');

test('verifyLplug4Package reports missing tool', () => {
  const diagnostics = { logiPluginTool: { available: false } };
  const result = verifyLplug4Package('/tmp/plugin.lplug4', diagnostics);

  assert.equal(result.attempted, false);
  assert.equal(result.passed, false);
  assert.match(result.message, /not available/i);
});

test('verifyLplug4Package returns passed on zero exit', () => {
  const diagnostics = { logiPluginTool: { available: true } };
  const runner = () => ({ status: 0, stdout: 'ok', stderr: '' });
  const result = verifyLplug4Package('/tmp/plugin.lplug4', diagnostics, runner);

  assert.equal(result.attempted, true);
  assert.equal(result.passed, true);
  assert.equal(result.output, 'ok');
});

test('verifyLplug4Package returns failure details on non-zero exit', () => {
  const diagnostics = { logiPluginTool: { available: true } };
  const runner = () => ({ status: 1, stdout: '', stderr: 'invalid package' });
  const result = verifyLplug4Package('/tmp/plugin.lplug4', diagnostics, runner);

  assert.equal(result.attempted, true);
  assert.equal(result.passed, false);
  assert.match(result.output || '', /invalid package/i);
});
