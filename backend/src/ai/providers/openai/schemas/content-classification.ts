export const contentClassificationJsonSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        regions: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    id: { type: 'integer' },
                    role: { type: 'string', enum: ['advertisement', 'metadata', 'noise', 'unknown'] },
                },
                required: ['id', 'role'],
            },
        },
    },
    required: ['regions'],
} as const;
