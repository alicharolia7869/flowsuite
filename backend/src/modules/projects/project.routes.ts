import { Router } from 'express';
import {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from './project.controller';
import { createProjectSchema, updateProjectSchema } from './project.schema';
import { authenticate } from '../../middleware/auth';
import { requireTenantContext } from '../../middleware/tenant';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { trackApiUsage } from '../../middleware/apiTracker';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);
router.use(trackApiUsage);

router.get('/', listProjects);
router.get('/:id', getProjectById);
router.post('/', requireRole(['OWNER', 'ADMIN', 'MANAGER']), validate(createProjectSchema), createProject);
router.patch('/:id', requireRole(['OWNER', 'ADMIN', 'MANAGER']), validate(updateProjectSchema), updateProject);
router.delete('/:id', requireRole(['OWNER', 'ADMIN', 'MANAGER']), deleteProject);

export default router;
