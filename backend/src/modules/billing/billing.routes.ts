import { Router } from 'express';
import {
  getPlans,
  getCurrentSubscription,
  createCheckout,
  handleWebhook,
  simulatePlanChange,
} from './billing.controller';
import { createCheckoutSessionSchema, simulatePlanChangeSchema } from './billing.schema';
import { authenticate } from '../../middleware/auth';
import { requireTenantContext } from '../../middleware/tenant';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { trackApiUsage } from '../../middleware/apiTracker';

const router = Router();

// Webhook endpoint (unauthenticated, called by Stripe)
router.post('/webhook', handleWebhook);
router.post('/billing/webhook', handleWebhook);

// Plans list endpoint
router.get('/plans', getPlans);

// Authenticated Subscription & Billing routes
router.get('/subscription', authenticate, requireTenantContext, trackApiUsage, getCurrentSubscription);

router.post(
  ['/checkout', '/billing/checkout'],
  authenticate,
  requireTenantContext,
  requireRole(['OWNER']),
  validate(createCheckoutSessionSchema),
  createCheckout
);

router.post(
  ['/simulate', '/billing/simulate'],
  authenticate,
  requireTenantContext,
  requireRole(['OWNER']),
  validate(simulatePlanChangeSchema),
  simulatePlanChange
);

export default router;
