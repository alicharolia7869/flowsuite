import { Router } from 'express';
import {
  getUserOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from './organization.controller';
import { updateOrgSchema } from './organization.schema';
import { authenticate } from '../../middleware/auth';
import { requireTenantContext } from '../../middleware/tenant';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { trackApiUsage } from '../../middleware/apiTracker';

const router = Router();

router.use(authenticate);

router.get('/', getUserOrganizations);
router.get('/current', requireTenantContext, trackApiUsage, getOrganizationById);
router.get('/:id', requireTenantContext, trackApiUsage, getOrganizationById);
router.patch('/current', requireTenantContext, requireRole(['OWNER']), validate(updateOrgSchema), updateOrganization);
router.patch('/:id', requireTenantContext, requireRole(['OWNER']), validate(updateOrgSchema), updateOrganization);
router.delete('/current', requireTenantContext, requireRole(['OWNER']), deleteOrganization);
router.delete('/:id', requireTenantContext, requireRole(['OWNER']), deleteOrganization);

export default router;
