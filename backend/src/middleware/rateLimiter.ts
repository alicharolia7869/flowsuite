import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { AppError } from './errorHandler';

export async function loginRateLimiter(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const email = req.body?.email ? String(req.body.email).toLowerCase() : '';
  const key = `ratelimit:login:${ip}:${email}`;

  try {
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, 900); // 15 minutes window
    }

    if (attempts > 5) {
      throw new AppError(
        'Too many failed login attempts. Please wait 15 minutes before trying again.',
        'TOO_MANY_REQUESTS',
        429
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

export async function clearLoginAttempts(ip: string, email: string): Promise<void> {
  const key = `ratelimit:login:${ip}:${email.toLowerCase()}`;
  await redis.del(key);
}
