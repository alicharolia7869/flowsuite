import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

export interface TokenPayload {
  userId: string;
  email: string;
  organizationId?: string;
  role?: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Session expired. Please log in again.', 'UNAUTHORIZED', 401);
    }
    throw new AppError('Invalid authentication token.', 'UNAUTHORIZED', 401);
  }
}

export function verifyRefreshToken(token: string): { userId: string } {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Invalid or expired refresh token. Please log in again.', 'UNAUTHORIZED', 401);
    }
    throw new AppError('Invalid or expired refresh token. Please log in again.', 'UNAUTHORIZED', 401);
  }
}

