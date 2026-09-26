export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'FlowSuite API — Multi-Tenant SaaS Workspace Platform',
    version: '1.0.0',
    description:
      'Production-grade REST API for FlowSuite. Features strict tenant isolation, server-side RBAC (OWNER, ADMIN, MANAGER, MEMBER), dynamic plan entitlements, Stripe billing, and immutable audit logs.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      organizationHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'x-organization-id',
        description: 'Optional organization ID to establish tenant context explicitly',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'PLAN_LIMIT_REACHED' },
              message: { type: 'string', example: 'Your current plan allows a maximum of 2 projects.' },
              status: { type: 'integer', example: 403 },
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
      organizationHeader: [],
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health Check',
        responses: {
          '200': { description: 'API service is operational' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register User & Organization',
        description: 'Creates a new user, organization, sets role to OWNER, and assigns FREE plan.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'organizationName'],
                properties: {
                  name: { type: 'string', example: 'Jane Doe' },
                  email: { type: 'string', example: 'jane@company.com' },
                  password: { type: 'string', example: 'SecurePassword123!' },
                  organizationName: { type: 'string', example: 'Acme International' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Registered successfully' },
          '400': { description: 'User already exists' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'owner@acme.com' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Logged in successfully with JWT' },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Too many failed login attempts' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate Refresh Token',
        security: [],
        responses: {
          '200': { description: 'Tokens rotated' },
          '401': { description: 'Invalid or expired token' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get Authenticated User Profile & Organizations',
        responses: {
          '200': { description: 'User profile with memberships' },
        },
      },
    },
    '/organizations/current': {
      get: {
        summary: 'Get Current Organization Details',
        responses: {
          '200': { description: 'Organization metadata, plan, and member count' },
        },
      },
      patch: {
        summary: 'Update Organization Name/Settings (OWNER only)',
        responses: {
          '200': { description: 'Updated' },
          '403': { description: 'Requires OWNER role' },
        },
      },
    },
    '/members': {
      get: {
        summary: 'List Organization Members',
        responses: {
          '200': { description: 'Members list' },
        },
      },
    },
    '/members/invite': {
      post: {
        summary: 'Invite Team Member (OWNER/ADMIN, enforces SEAT_LIMIT)',
        responses: {
          '201': { description: 'Member invited' },
          '403': { description: 'Seat limit reached or forbidden' },
        },
      },
    },
    '/members/{id}/role': {
      patch: {
        summary: 'Change Member Role (OWNER only)',
        responses: {
          '200': { description: 'Role changed' },
        },
      },
    },
    '/projects': {
      get: {
        summary: 'List Projects (Role-scoped)',
        description: 'OWNER/ADMIN/MANAGER see all org projects; MEMBER sees only projects they are assigned to.',
        responses: {
          '200': { description: 'List of projects' },
        },
      },
      post: {
        summary: 'Create Project (OWNER/ADMIN/MANAGER, enforces PROJECT_LIMIT)',
        responses: {
          '201': { description: 'Project created' },
          '403': { description: 'Plan project limit reached' },
        },
      },
    },
    '/tasks': {
      get: {
        summary: 'List Tasks (Role-scoped)',
        description: 'OWNER/ADMIN/MANAGER see all tasks; MEMBER sees only assigned tasks.',
        responses: {
          '200': { description: 'List of tasks' },
        },
      },
      post: {
        summary: 'Create Task (OWNER/ADMIN/MANAGER)',
        responses: {
          '201': { description: 'Task created' },
        },
      },
    },
    '/customers': {
      get: {
        summary: 'List Customers (OWNER/ADMIN/MANAGER)',
        responses: {
          '200': { description: 'Customers list' },
        },
      },
      post: {
        summary: 'Create Customer (OWNER/ADMIN/MANAGER)',
        responses: {
          '201': { description: 'Customer created' },
        },
      },
    },
    '/plans': {
      get: {
        summary: 'Get All Available Subscription Plans',
        security: [],
        responses: {
          '200': { description: 'List of FREE, STARTER, PROFESSIONAL plans' },
        },
      },
    },
    '/subscription': {
      get: {
        summary: 'Get Current Subscription & Dynamic Entitlements',
        responses: {
          '200': { description: 'Active plan, renewal date, limits' },
        },
      },
    },
    '/billing/checkout': {
      post: {
        summary: 'Create Stripe Checkout Session (OWNER only)',
        responses: {
          '200': { description: 'Checkout URL returned' },
        },
      },
    },
    '/billing/simulate': {
      post: {
        summary: 'Simulate Plan Upgrade/Downgrade (OWNER only)',
        responses: {
          '200': { description: 'Plan updated with new entitlements' },
        },
      },
    },
    '/usage': {
      get: {
        summary: 'Get Real Backend Usage Statistics',
        description: 'Returns seat, project, and API consumption with plan limits and trend charts.',
        responses: {
          '200': { description: 'Usage data' },
        },
      },
    },
    '/audit-logs': {
      get: {
        summary: 'List Immutable Audit Logs (OWNER/ADMIN only)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'action', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Paginated audit logs' },
          '403': { description: 'Forbidden for MANAGER and MEMBER' },
        },
      },
    },
  },
};
