import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from './errorHandler';

export async function requireTenantContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required before establishing tenant context.', 'UNAUTHORIZED', 401);
    }

    const headerOrgId = req.headers['x-organization-id'] as string | undefined;

    let membership;
    if (headerOrgId) {
      membership = await prisma.membership.findFirst({
        where: {
          userId: req.user.id,
          organizationId: headerOrgId,
        },
      });

      if (!membership) {
        throw new AppError(
          'Access denied. You are not a member of the requested organization.',
          'FORBIDDEN',
          403
        );
      }
    } else {
      membership = await prisma.membership.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'asc' },
      });

      if (!membership) {
        throw new AppError(
          'No organization associated with this account. Please register or join an organization.',
          'NO_ORGANIZATION_ACCESS',
          403
        );
      }
    }

    req.tenant = {
      organizationId: membership.organizationId,
      role: membership.role as any,
    };

    next();
  } catch (error) {
    next(error);
  }
}
