import { z } from 'zod';

export const createCheckoutSessionSchema = z.object({
  body: z.object({
    planId: z.string().min(1, 'Plan ID is required'),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  }),
});

export const simulatePlanChangeSchema = z.object({
  body: z.object({
    planName: z.enum(['FREE', 'STARTER', 'PROFESSIONAL']),
  }),
});
