# Icon Scoring Rules (Deterministic)

This document defines how the builder chooses a Font Awesome icon for a generated C# action.

## Deterministic Formula

Each candidate starts with a pack weight and then receives additive bonuses/penalties.

`total = packWeight + tokenMatches + stateMatches + conceptMatches + toggleBonus + brandAdjustment`

## Scoring Inputs

- **Intent tokens:** Tokenized text from action name, description, and state labels.
- **State tokens:** Tokenized state labels only.
- **Concepts:** Domain groups inferred from the intent tokens (audio, playback, view, editing, etc.).
- **Action type:** `single`, `toggle`, or `multistate`.

## Pack Priority

Pack weights are currently:

- `regular`: 30 (preferred baseline)
- `solid`: 20
- `brands`: 5
- `unknown`: 0

This enforces regular-first selection while still allowing solid when semantic matching is stronger.

## Match Rules

- Exact token match between intent token and icon token: `+12`
- Partial token overlap: `+4`
- Exact state token match: `+3`
- Concept keyword appears in icon name: `+16`
- Toggle opposition bonus (play/pause, list/grid, mute/unmute, on/off, light/dark): `+8`
- Brand boost when brand intent is detected and icon is from brands pack: `+18`
- Brands penalty when no brand intent is detected and icon is from brands pack: `-8`

## Tie-Breakers

If two icons have the same total score:

1. Higher pack weight wins.
2. Alphabetical icon name wins.

This guarantees stable and repeatable icon selection.

## Configuration Source

All weights and concept groups live in:

- `/config/icon-scoring.json`

The ranking implementation lives in:

- `/src/icon-ranking.js`
