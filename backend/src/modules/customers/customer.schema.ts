import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Customer name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Customer name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
  }),
  params: z.object({
    id: z.string().min(1, 'Customer ID is required'),
  }),
});
