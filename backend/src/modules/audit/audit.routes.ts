import { Router } from 'express';
import { listAuditLogs } from './audit.controller';
import { authenticate } from '../../middleware/auth';
import { requireTenantContext } from '../../middleware/tenant';
import { requireRole } from '../../middleware/rbac';
import { trackApiUsage } from '../../middleware/apiTracker';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);
router.use(trackApiUsage);

router.get('/', requireRole(['OWNER', 'ADMIN']), listAuditLogs);

export default router;
