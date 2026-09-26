import { z } from 'zod';

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER'),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'OWNER']),
  }),
  params: z.object({
    id: z.string().min(1, 'Member ID is required'),
  }),
});
