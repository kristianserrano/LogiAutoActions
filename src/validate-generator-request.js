const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { generatorContractSchema } = require('./generator-contract-schema');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(generatorContractSchema);

function validateGeneratorRequest(payload) {
  const valid = validateSchema(payload);
  const errors = [];

  if (!valid) {
    for (const item of validateSchema.errors || []) {
      errors.push({
        path: item.instancePath || '/',
        message: item.message || 'Invalid value'
      });
    }
  }

  if (valid) {
    const seenIds = new Set();
    for (const action of payload.actions || []) {
      if (seenIds.has(action.id)) {
        errors.push({
          path: '/actions',
          message: `Duplicate action id: ${action.id}`
        });
      }
      seenIds.add(action.id);

      const states = action.intent && Array.isArray(action.intent.states)
        ? action.intent.states
        : [];

      if (action.actionKind === 'toggle' && states.length > 0 && states.length !== 2) {
        errors.push({
          path: `/actions/${action.id}/intent/states`,
          message: 'Toggle actions must define exactly 2 states when states are provided.'
        });
      }

      if (action.actionKind === 'multistate' && states.length < 3) {
        errors.push({
          path: `/actions/${action.id}/intent/states`,
          message: 'Multistate actions must define at least 3 states.'
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateGeneratorRequest
};
