/** Stage two: classify only the skills that are absent from the catalogue. */
export const skillCategorizationJsonSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
        skills: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    name: { type: 'string' },
                    category: { type: 'string' },
                },
                required: ['name', 'category'],
            },
        },
    },
    required: ['skills'],
} as const;
