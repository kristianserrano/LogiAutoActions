const generatorContractSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  additionalProperties: false,
  required: ['projectName', 'displayName', 'author', 'version', 'actions'],
  properties: {
    projectName: {
      type: 'string',
      minLength: 1,
      pattern: '^[A-Za-z][A-Za-z0-9_]{1,79}$'
    },
    displayName: { type: 'string', minLength: 1, maxLength: 120 },
    author: { type: 'string', minLength: 1, maxLength: 120 },
    version: {
      type: 'string',
      pattern: '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$'
    },
    description: { type: 'string', maxLength: 400 },
    category: { type: 'string', maxLength: 80 },
    homepageUrl: { type: 'string', format: 'uri' },
    license: { type: 'string', maxLength: 80 },
    supportedDevices: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { type: 'string', minLength: 1 }
    },
    minimumLoupedeckVersion: {
      type: 'string',
      pattern: '^[0-9]+\\.[0-9]+(?:\\.[0-9]+)?$'
    },
    appLinking: {
      type: 'object',
      additionalProperties: false,
      properties: {
        enabled: { type: 'boolean' },
        processNames: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true
        },
        bundleNames: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true
        },
        fuzzyContains: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          uniqueItems: true
        }
      }
    },
    actions: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'actionKind'],
        properties: {
          id: { type: 'string', minLength: 1, maxLength: 100 },
          name: { type: 'string', minLength: 1, maxLength: 120 },
          description: { type: 'string', maxLength: 400 },
          groupPath: { type: 'string', maxLength: 160 },
          actionKind: {
            type: 'string',
            enum: ['command', 'adjustment', 'toggle', 'multistate']
          },
          intent: {
            type: 'object',
            additionalProperties: false,
            properties: {
              sourceShortcuts: {
                type: 'array',
                items: { type: 'string', minLength: 1 },
                uniqueItems: true
              },
              states: {
                type: 'array',
                items: { type: 'string', minLength: 1 },
                minItems: 1,
                uniqueItems: true
              },
              parameterHints: {
                type: 'array',
                items: { type: 'string', minLength: 1 },
                uniqueItems: true
              }
            }
          },
          behavior: {
            type: 'object',
            additionalProperties: false,
            properties: {
              keyboardShortcuts: {
                type: 'array',
                items: { type: 'string', minLength: 1 },
                minItems: 1
              },
              resetOnPress: { type: 'boolean' },
              defaultValue: {
                anyOf: [
                  { type: 'number' },
                  { type: 'string', minLength: 1 }
                ]
              }
            }
          },
          icon: {
            type: 'object',
            additionalProperties: false,
            properties: {
              preferred: { type: 'string', minLength: 1 },
              selected: {
                type: 'object',
                additionalProperties: false,
                required: ['path'],
                properties: {
                  path: { type: 'string', minLength: 1 },
                  pack: { type: 'string', minLength: 1 },
                  score: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }
};

module.exports = {
  generatorContractSchema
};
