import { z } from 'zod';

export const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    title: z.string().min(2, 'Task title must be at least 2 characters'),
    description: z.string().optional(),
    assigneeId: z.string().optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
    dueDate: z.string().datetime().optional().nullable(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Task title must be at least 2 characters').optional(),
    description: z.string().optional().nullable(),
    assigneeId: z.string().optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    dueDate: z.string().datetime().optional().nullable(),
  }),
  params: z.object({
    id: z.string().min(1, 'Task ID is required'),
  }),
});
