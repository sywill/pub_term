/**
 * OpenAPI/Swagger API Documentation for PubTerm
 */
export const swaggerDocument = {
    openapi: '3.0.3',
    info: {
        title: 'PubTerm API',
        version: '1.0.0',
        description: 'Remote AI Terminal Monitoring System API',
        contact: {
            name: 'PubTerm',
        },
    },
    servers: [
        {
            url: '/api',
            description: 'API Server',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' },
                    role: { type: 'string', enum: ['ADMIN', 'VIEWER'] },
                },
            },
            Session: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'TERMINATED'] },
                    ownerId: { type: 'string' },
                },
            },
            Error: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            code: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
    paths: {
        '/auth/register': {
            post: {
                tags: ['Authentication'],
                summary: 'Register a new user',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password', 'name'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 8 },
                                    name: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': {
                        description: 'User registered successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        user: { $ref: '#/components/schemas/User' },
                                        token: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    '400': { description: 'Validation error' },
                },
            },
        },
        '/auth/login': {
            post: {
                tags: ['Authentication'],
                summary: 'Login user',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': {
                        description: 'Login successful',
                    },
                    '401': { description: 'Invalid credentials' },
                },
            },
        },
        '/sessions': {
            get: {
                tags: ['Sessions'],
                summary: 'List all accessible sessions',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'List of sessions',
                    },
                },
            },
            post: {
                tags: ['Sessions'],
                summary: 'Create a new session',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name'],
                                properties: {
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '201': { description: 'Session created' },
                },
            },
        },
        '/sessions/{id}': {
            get: {
                tags: ['Sessions'],
                summary: 'Get session by ID',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                    },
                ],
                responses: {
                    '200': { description: 'Session details' },
                    '404': { description: 'Session not found' },
                },
            },
            delete: {
                tags: ['Sessions'],
                summary: 'Delete session',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                    },
                ],
                responses: {
                    '200': { description: 'Session deleted' },
                },
            },
        },
        '/sessions/{id}/invite': {
            post: {
                tags: ['Sessions'],
                summary: 'Create invite link for session',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        schema: { type: 'string' },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['role'],
                                properties: {
                                    role: { type: 'string', enum: ['VIEWER', 'OPERATOR'] },
                                },
                            },
                        },
                    },
                },
                responses: {
                    '200': { description: 'Invite token created' },
                },
            },
        },
    },
};
