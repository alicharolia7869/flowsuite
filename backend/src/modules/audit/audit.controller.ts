import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';

export async function listAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { organizationId } = req.tenant!;
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const action = req.query.action as string | undefined;
    const sort = (req.query.sort as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where: any = { organizationId };

    if (action) {
      where.action = action;
    }

    const total = await prisma.auditLog.count({ where });

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: sort },
      skip: (page - 1) * limit,
      take: limit,
    });

    const parsedLogs = logs.map(l => ({
      id: l.id,
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadata ? (typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata) : null,
      timestamp: l.timestamp,
      actor: l.actor ? {
        id: l.actor.id,
        name: l.actor.name,
        email: l.actor.email,
      } : { id: null, name: 'System / Automated', email: 'system@flowsuite.internal' },
    }));

    res.status(200).json({
      logs: parsedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}
