import { Router } from 'express';
import {
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from './member.controller';
import { inviteMemberSchema, updateMemberRoleSchema } from './member.schema';
import { authenticate } from '../../middleware/auth';
import { requireTenantContext } from '../../middleware/tenant';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { trackApiUsage } from '../../middleware/apiTracker';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);
router.use(trackApiUsage);

router.get('/', listMembers);
router.post('/invite', requireRole(['OWNER', 'ADMIN']), validate(inviteMemberSchema), inviteMember);
router.patch('/:id/role', requireRole(['OWNER']), validate(updateMemberRoleSchema), updateMemberRole);
router.delete('/:id', requireRole(['OWNER']), removeMember);

export default router;
