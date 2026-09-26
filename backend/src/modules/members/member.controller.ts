import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createAuditLog } from '../../utils/audit';
import { assertEntitlementLimit } from '../../utils/entitlements';
import { hashPassword } from '../../utils/password';

export async function listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;

    const memberships = await prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const members = memberships.map(m => ({
      id: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt,
    }));

    res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
}

export async function inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { email, name, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Enforce Entitlement: SEAT_LIMIT
    await assertEntitlementLimit(organizationId, 'SEAT_LIMIT');

    // 2. Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const temporaryPassword = await hashPassword('Password123!');
      user = await prisma.user.create({
        data: {
          name: name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          passwordHash: temporaryPassword,
        },
      });
    }

    // Check if already a member
    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: user.id,
        organizationId,
      },
    });

    if (existingMembership) {
      throw new AppError('This user is already a member of this organization.', 'MEMBER_ALREADY_EXISTS', 400);
    }

    // 3. Create membership
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId,
        role: role || 'MEMBER',
      },
    });

    // 4. Update seatsUsed in UsageCounter
    const totalMembers = await prisma.membership.count({ where: { organizationId } });
    await prisma.usageCounter.update({
      where: { organizationId },
      data: { seatsUsed: totalMembers },
    }).catch(() => {});

    // 5. Create Audit Log
    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'MEMBER_INVITED',
      targetType: 'Membership',
      targetId: membership.id,
      metadata: { invitedEmail: normalizedEmail, role: membership.role },
    });

    res.status(201).json({
      message: 'Member invited successfully.',
      member: {
        id: membership.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        joinedAt: membership.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { id } = req.params;
    const { role } = req.body;

    const membership = await prisma.membership.findUnique({
      where: { id },
    });

    if (!membership || membership.organizationId !== organizationId) {
      throw new AppError('Member not found in this organization.', 'NOT_FOUND', 404);
    }

    // If changing role of an OWNER, ensure at least one other OWNER remains
    if (membership.role === 'OWNER' && role !== 'OWNER') {
      const ownerCount = await prisma.membership.count({
        where: { organizationId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new AppError('Cannot demote the only OWNER of the organization.', 'BAD_REQUEST', 400);
      }
    }

    const updated = await prisma.membership.update({
      where: { id },
      data: { role },
    });

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'MEMBER_ROLE_CHANGED',
      targetType: 'Membership',
      targetId: membership.id,
      metadata: { previousRole: membership.role, newRole: role, targetUserId: membership.userId },
    });

    res.status(200).json({
      message: 'Member role updated successfully.',
      member: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const { id } = req.params;

    const membership = await prisma.membership.findUnique({
      where: { id },
    });

    if (!membership || membership.organizationId !== organizationId) {
      throw new AppError('Member not found in this organization.', 'NOT_FOUND', 404);
    }

    if (membership.role === 'OWNER') {
      const ownerCount = await prisma.membership.count({
        where: { organizationId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new AppError('Cannot remove the only OWNER of the organization.', 'BAD_REQUEST', 400);
      }
    }

    await prisma.membership.delete({
      where: { id },
    });

    // Update seatsUsed in UsageCounter
    const totalMembers = await prisma.membership.count({ where: { organizationId } });
    await prisma.usageCounter.update({
      where: { organizationId },
      data: { seatsUsed: totalMembers },
    }).catch(() => {});

    await createAuditLog({
      organizationId,
      actorId: req.user?.id,
      action: 'MEMBER_REMOVED',
      targetType: 'Membership',
      targetId: id,
      metadata: { removedUserId: membership.userId, previousRole: membership.role },
    });

    res.status(200).json({ message: 'Member removed successfully.' });
  } catch (error) {
    next(error);
  }
}
