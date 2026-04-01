const { spawnSync } = require('child_process');

function verifyLplug4Package(packagePath, diagnostics, runner = spawnSync) {
  const hasVerifier = Boolean(diagnostics && diagnostics.logiPluginTool && diagnostics.logiPluginTool.available);
  if (!hasVerifier) {
    return {
      attempted: false,
      passed: false,
      message: 'LogiPluginTool is not available. Cannot verify package.',
      output: null
    };
  }

  const result = runner('LogiPluginTool', ['verify', packagePath], {
    encoding: 'utf8',
    timeout: 120000
  });

  const output = `${result.stdout || ''}${result.stderr || ''}`.trim() || null;
  const passed = result.status === 0;

  return {
    attempted: true,
    passed,
    message: passed ? 'Package verification passed.' : 'Package verification failed.',
    output
  };
}

module.exports = {
  verifyLplug4Package
};
