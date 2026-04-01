const fs = require('fs');
const path = require('path');

const scoringConfig = require('../config/icon-scoring.json');

const PACK_NAMES = {
  regular: 'regular',
  solid: 'solid',
  brands: 'brands'
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'between',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with'
]);

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
    .map((token) => (token.endsWith('s') ? token.slice(0, -1) : token))
    .filter((token) => !STOP_WORDS.has(token));
}

function detectPackFromPath(iconPath) {
  const normalized = normalizeText(iconPath);
  if (normalized.includes('regular')) {
    return PACK_NAMES.regular;
  }
  if (normalized.includes('solid')) {
    return PACK_NAMES.solid;
  }
  if (normalized.includes('brands')) {
    return PACK_NAMES.brands;
  }
  return 'unknown';
}

function inferConcepts(tokens) {
  const detected = new Set();

  for (const [concept, conceptTokens] of Object.entries(scoringConfig.concepts || {})) {
    if (conceptTokens.some((term) => tokens.includes(term))) {
      detected.add(concept);
    }
  }

  return detected;
}

function scoreIconCandidate(intentTokens, stateTokens, concepts, isToggle, candidate) {
  const iconBaseName = path.basename(candidate.path, '.svg');
  const iconTokens = tokenize(iconBaseName);
  const iconTokenSet = new Set(iconTokens);
  const iconText = normalizeText(iconBaseName);
  const pack = candidate.pack || detectPackFromPath(candidate.path);

  let score = scoringConfig.packWeights[pack] ?? scoringConfig.packWeights.unknown;
  const reasons = [`pack:${pack}`];

  for (const token of intentTokens) {
    if (iconTokenSet.has(token)) {
      score += scoringConfig.tokenExactMatch;
      reasons.push(`exact:${token}`);
      continue;
    }

    if (iconTokens.some((iconToken) => iconToken.includes(token) || token.includes(iconToken))) {
      score += scoringConfig.tokenPartialMatch;
      reasons.push(`partial:${token}`);
    }
  }

  for (const token of stateTokens) {
    if (iconTokenSet.has(token)) {
      score += scoringConfig.stateTokenBonus;
      reasons.push(`state:${token}`);
    }
  }

  for (const concept of concepts) {
    const conceptTerms = scoringConfig.concepts[concept] || [];
    if (conceptTerms.some((term) => iconText.includes(term))) {
      score += scoringConfig.conceptKeywordMatch;
      reasons.push(`concept:${concept}`);
    }
  }

  const intentHasBrand = concepts.has('brand');
  if (intentHasBrand && pack === PACK_NAMES.brands) {
    score += scoringConfig.brandBoostForBrandIntent;
    reasons.push('brand:intent-boost');
  }

  if (!intentHasBrand && pack === PACK_NAMES.brands) {
    score += scoringConfig.brandsPenaltyForNonBrandIntent;
    reasons.push('brand:non-intent-penalty');
  }

  // For toggle actions, reward icons that represent opposite state markers.
  if (isToggle) {
    const oppositePairs = [
      ['play', 'pause'],
      ['list', 'grid'],
      ['mute', 'unmute'],
      ['on', 'off'],
      ['light', 'dark']
    ];

    const hitPair = oppositePairs.some(
      ([a, b]) => intentTokens.includes(a) && intentTokens.includes(b) && (iconTokenSet.has(a) || iconTokenSet.has(b))
    );

    if (hitPair) {
      score += scoringConfig.toggleOppositionBonus;
      reasons.push('toggle:opposition');
    }
  }

  return {
    ...candidate,
    pack,
    score,
    reasons,
    iconName: iconBaseName
  };
}

function buildIntentContext(payload) {
  const actionName = payload.actionName || '';
  const description = payload.description || '';
  const states = Array.isArray(payload.states) ? payload.states : [];
  const actionType = payload.actionType || 'single';

  const stateText = states
    .map((state) => (typeof state === 'string' ? state : state.name || ''))
    .join(' ');

  const intentTokens = tokenize([actionName, description, stateText].join(' '));
  const stateTokens = Array.from(new Set(tokenize(stateText)));
  const uniqueIntentTokens = Array.from(new Set(intentTokens));
  const concepts = inferConcepts(uniqueIntentTokens);

  return {
    intentTokens: uniqueIntentTokens,
    stateTokens,
    concepts,
    isToggle: actionType === 'toggle' || actionType === 'multistate'
  };
}

function rankIcons(payload) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const { intentTokens, stateTokens, concepts, isToggle } = buildIntentContext(payload);

  const ranked = candidates
    .map((candidate) => scoreIconCandidate(intentTokens, stateTokens, concepts, isToggle, candidate))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Deterministic tie-breakers: pack preference, then alphabetical icon name.
      const packDelta =
        (scoringConfig.packWeights[b.pack] ?? 0) - (scoringConfig.packWeights[a.pack] ?? 0);
      if (packDelta !== 0) {
        return packDelta;
      }

      return a.iconName.localeCompare(b.iconName);
    });

  return {
    intentTokens,
    concepts: Array.from(concepts),
    ranked,
    selected: ranked[0] || null
  };
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
  rankIcons,
  scanIconCandidates
};
