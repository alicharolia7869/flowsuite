import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend or root if present
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/flowsuite?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'flowsuite_super_secret_jwt_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'flowsuite_super_secret_refresh_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_51MockStripeKeyForFlowSuiteTesting1234567890',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mockWebhookSecretForTesting12345',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
};
