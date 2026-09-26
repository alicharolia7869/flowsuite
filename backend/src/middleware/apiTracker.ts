import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { assertEntitlementLimit } from '../utils/entitlements';

export async function trackApiUsage(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.tenant?.organizationId) {
      return next();
    }

    const { organizationId } = req.tenant;

    // Check limit first
    await assertEntitlementLimit(organizationId, 'API_REQUEST_LIMIT');

    // Asynchronously increment Redis cache and Database usage counter
    const redisKey = `usage:api:${organizationId}`;
    redis.incr(redisKey).catch(() => {});

    // Update database counter
    prisma.usageCounter.upsert({
      where: { organizationId },
      create: {
        organizationId,
        apiRequestsUsed: 1,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        apiRequestsUsed: { increment: 1 },
      },
    }).catch(err => {
      console.error('Failed to increment API usage counter:', err);
    });

    next();
  } catch (error) {
    next(error);
  }
}
