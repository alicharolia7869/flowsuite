import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { swaggerDocument } from './docs/swagger';

import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organizations/organization.routes';
import memberRoutes from './modules/members/member.routes';
import projectRoutes from './modules/projects/project.routes';
import taskRoutes from './modules/tasks/task.routes';
import customerRoutes from './modules/customers/customer.routes';
import billingRoutes from './modules/billing/billing.routes';
import usageRoutes from './modules/usage/usage.routes';
import auditRoutes from './modules/audit/audit.routes';

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows Swagger UI and local development
}));

// CORS Middleware
app.use(cors({
  origin: [
    env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'stripe-signature'],
}));

// Body Parsers (Raw body parser for Stripe webhooks if needed)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/billing/webhook') {
    express.raw({ type: 'application/json' })(req, res, (err) => {
      if (err) return next(err);
      if (Buffer.isBuffer(req.body)) {
        try {
          (req as any).rawBody = req.body;
          req.body = JSON.parse(req.body.toString());
        } catch {
          // keep as raw buffer
        }
      }
      next();
    });
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'FlowSuite API',
  });
});

// Swagger Documentation UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1', billingRoutes); // mounts /plans, /subscription, /billing/*
app.use('/api/v1/usage', usageRoutes);
app.use('/api/v1/audit-logs', auditRoutes);

// 404 Route Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested API endpoint was not found.',
      status: 404,
    },
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
