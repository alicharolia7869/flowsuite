import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/audit';

export async function getUserOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required.', 'UNAUTHORIZED', 401);
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: req.user.id },
      include: {
        organization: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    const organizations = memberships.map(m => ({
      id: m.organization.id,
      name: m.organization.name,
      status: m.organization.status,
      role: m.role,
      plan: m.organization.subscription?.plan?.name || 'FREE',
      joinedAt: m.createdAt,
    }));

    res.status(200).json({ organizations });
  } catch (error) {
    next(error);
  }
}

export async function getOrganizationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = (!req.params.id || req.params.id === 'current') ? req.tenant?.organizationId : req.params.id;

    if (!orgId) {
      throw new AppError('Organization ID is required.', 'BAD_REQUEST', 400);
    }

    // Tenant isolation verification
    if (req.tenant && req.tenant.organizationId !== orgId) {
      throw new AppError('Access denied to other organization resources.', 'FORBIDDEN', 403);
    }

    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        subscription: {
          include: { plan: true },
        },
        usageCounter: true,
      },
    });

    if (!organization) {
      throw new AppError('Organization not found.', 'NOT_FOUND', 404);
    }

    const memberCount = await prisma.membership.count({
      where: { organizationId: orgId },
    });

    res.status(200).json({
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status,
        memberCount,
        subscription: organization.subscription,
        usage: organization.usageCounter,
        createdAt: organization.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = (!req.params.id || req.params.id === 'current') ? req.tenant?.organizationId : req.params.id;
    if (!orgId) {
      throw new AppError('Organization ID is required.', 'BAD_REQUEST', 400);
    }
    const { name } = req.body;

    if (req.tenant && req.tenant.organizationId !== orgId) {
      throw new AppError('Access denied to other organization resources.', 'FORBIDDEN', 403);
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { name },
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: req.user?.id,
      action: 'ORGANIZATION_UPDATED',
      targetType: 'Organization',
      targetId: orgId,
      metadata: { newName: name },
    });

    res.status(200).json({
      message: 'Organization updated successfully.',
      organization: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = (!req.params.id || req.params.id === 'current') ? req.tenant?.organizationId : req.params.id;
    if (!orgId) {
      throw new AppError('Organization ID is required.', 'BAD_REQUEST', 400);
    }

    if (req.tenant && req.tenant.organizationId !== orgId) {
      throw new AppError('Access denied to other organization resources.', 'FORBIDDEN', 403);
    }

    await prisma.organization.delete({
      where: { id: orgId },
    });

    await createAuditLog({
      organizationId: orgId,
      actorId: req.user?.id,
      action: 'ORGANIZATION_DELETED',
      targetType: 'Organization',
      targetId: orgId,
    });

    res.status(200).json({ message: 'Organization deleted successfully.' });
  } catch (error) {
    next(error);
  }
}
