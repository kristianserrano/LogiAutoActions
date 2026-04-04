const fs = require('fs');
const path = require('path');

function detectPackFromPath(iconPath) {
  const value = String(iconPath || '').toLowerCase();
  if (value.includes('regular')) return 'regular';
  if (value.includes('solid')) return 'solid';
  if (value.includes('brands')) return 'brands';
  return 'unknown';
}

function scanIconCandidates(rootDir) {
  const out = [];

  function walk(currentDir) {
    for (const item of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (item.isFile() && item.name.toLowerCase().endsWith('.svg')) {
        const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join('/');
        out.push({
          path: relativePath,
          pack: detectPackFromPath(relativePath)
        });
      }
    }
  }

  walk(rootDir);
  return out;
}

module.exports = {
  scanIconCandidates
};
