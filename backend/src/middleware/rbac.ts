import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      next(new AppError('Tenant context missing. Unable to verify permissions.', 'UNAUTHORIZED', 401));
      return;
    }

    if (!allowedRoles.includes(req.tenant.role as Role)) {
      next(
        new AppError(
          `Permission denied. This action requires one of the following roles: [${allowedRoles.join(
            ', '
          )}]. Your role is ${req.tenant.role}.`,
          'FORBIDDEN',
          403
        )
      );
      return;
    }

    next();
  };
}
