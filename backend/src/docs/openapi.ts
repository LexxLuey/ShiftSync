// @ts-ignore - swagger-jsdoc lacks type definitions
import swaggerJsdoc from 'swagger-jsdoc';

const configuredServerUrl = process.env.SWAGGER_SERVER_URL?.trim();
const serverUrl = configuredServerUrl && configuredServerUrl.length > 0
    ? configuredServerUrl
    : '/';

const swaggerOptions = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'ShiftSync API',
            version: '1.0.0',
            description: 'ShiftSync backend API documentation.',
        },
        servers: [
            {
                url: serverUrl,
            },
        ],
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management endpoints' },
            { name: 'Locations', description: 'Location management endpoints' },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', example: 'VALIDATION_ERROR' },
                                message: { type: 'string', example: 'Invalid request payload' },
                                details: { nullable: true },
                                severity: {
                                    type: 'string',
                                    enum: ['info', 'warning', 'error', 'critical'],
                                },
                                suggestions: {
                                    type: 'array',
                                    items: { type: 'string' },
                                },
                            },
                            required: ['code', 'message', 'details', 'severity', 'suggestions'],
                        },
                    },
                    required: ['success', 'error'],
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'STAFF'] },
                        phone: { type: 'string', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                    required: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt'],
                },
                Location: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        address: { type: 'string' },
                        timezone: { type: 'string', example: 'America/New_York' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                    required: ['id', 'name', 'address', 'timezone', 'createdAt', 'updatedAt'],
                },
                Certification: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        locationId: { type: 'string', format: 'uuid' },
                        revokedAt: { type: 'string', format: 'date-time', nullable: true },
                    },
                    required: ['id', 'userId', 'locationId'],
                },
                PaginationMeta: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 20 },
                        total: { type: 'integer', example: 100 },
                        totalPages: { type: 'integer', example: 5 },
                    },
                    required: ['page', 'limit', 'total', 'totalPages'],
                },
                RegisterRequest: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 8 },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'STAFF'] },
                        phone: { type: 'string' },
                    },
                    required: ['email', 'password', 'firstName', 'lastName', 'role'],
                },
                LoginRequest: {
                    type: 'object',
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 8 },
                    },
                    required: ['email', 'password'],
                },
                AuthTokenResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        user: { $ref: '#/components/schemas/User' },
                    },
                    required: ['token', 'user'],
                },
                UpdateUserRequest: {
                    type: 'object',
                    properties: {
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        phone: { type: 'string', nullable: true },
                        role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'STAFF'] },
                    },
                },
                AddCertificationRequest: {
                    type: 'object',
                    properties: {
                        locationId: { type: 'string', format: 'uuid' },
                    },
                    required: ['locationId'],
                },
                CreateLocationRequest: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        address: { type: 'string' },
                        timezone: { type: 'string', example: 'America/New_York' },
                    },
                    required: ['name', 'address', 'timezone'],
                },
                UpdateLocationRequest: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        address: { type: 'string' },
                        timezone: { type: 'string', example: 'America/New_York' },
                    },
                },
                AssignManagerRequest: {
                    type: 'object',
                    properties: {
                        userId: { type: 'string', format: 'uuid' },
                    },
                    required: ['userId'],
                },
            },
            parameters: {
                IdParam: {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
                LocationIdParam: {
                    name: 'locationId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
                UserIdParam: {
                    name: 'userId',
                    in: 'path',
                    required: true,
                    schema: { type: 'string', format: 'uuid' },
                },
                PageQuery: {
                    name: 'page',
                    in: 'query',
                    schema: { type: 'integer', minimum: 1, default: 1 },
                },
                LimitQuery: {
                    name: 'limit',
                    in: 'query',
                    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                },
                RoleQuery: {
                    name: 'role',
                    in: 'query',
                    schema: { type: 'string', enum: ['ADMIN', 'MANAGER', 'STAFF'] },
                },
                LocationFilterQuery: {
                    name: 'locationId',
                    in: 'query',
                    schema: { type: 'string', format: 'uuid' },
                },
            },
        },
    },
    apis: ['src/modules/**/*.ts'],
};

const openApiSpec = swaggerJsdoc(swaggerOptions);

export default openApiSpec;
