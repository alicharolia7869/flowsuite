import { Router } from 'express';
import {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from './task.controller';
import { createTaskSchema, updateTaskSchema } from './task.schema';
import { authenticate } from '../../middleware/auth';
import { requireTenantContext } from '../../middleware/tenant';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { trackApiUsage } from '../../middleware/apiTracker';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);
router.use(trackApiUsage);

router.get('/', listTasks);
router.get('/:id', getTaskById);
router.post('/', requireRole(['OWNER', 'ADMIN', 'MANAGER']), validate(createTaskSchema), createTask);
router.patch('/:id', validate(updateTaskSchema), updateTask);
router.delete('/:id', requireRole(['OWNER', 'ADMIN', 'MANAGER']), deleteTask);

export default router;
