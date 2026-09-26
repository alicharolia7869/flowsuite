import { z } from 'zod';

export const updateOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Organization name must be at least 2 characters'),
  }),
});
