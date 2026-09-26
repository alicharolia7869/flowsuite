import { Router } from 'express';
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './customer.controller';
import { createCustomerSchema, updateCustomerSchema } from './customer.schema';
import { authenticate } from '../../middleware/auth';
import { requireTenantContext } from '../../middleware/tenant';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { trackApiUsage } from '../../middleware/apiTracker';

const router = Router();

router.use(authenticate);
router.use(requireTenantContext);
router.use(trackApiUsage);

router.get('/', requireRole(['OWNER', 'ADMIN', 'MANAGER']), listCustomers);
router.get('/:id', requireRole(['OWNER', 'ADMIN', 'MANAGER']), getCustomerById);
router.post('/', requireRole(['OWNER', 'ADMIN', 'MANAGER']), validate(createCustomerSchema), createCustomer);
router.patch('/:id', requireRole(['OWNER', 'ADMIN', 'MANAGER']), validate(updateCustomerSchema), updateCustomer);
router.delete('/:id', requireRole(['OWNER', 'ADMIN', 'MANAGER']), deleteCustomer);

export default router;
