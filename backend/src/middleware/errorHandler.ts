import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PlanLimitError } from '../utils/entitlements';

export class AppError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = 'BAD_REQUEST', status: number = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Plan Limit Enforcement
  if (err instanceof PlanLimitError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        status: err.status,
      },
    });
    return;
  }

  // AppError (Custom operational error)
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        status: err.status,
      },
    });
    return;
  }

  // Zod Validation Error
  if (err instanceof ZodError) {
    const formatted = err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: formatted || 'Validation error in request payload.',
        status: 400,
      },
    });
    return;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid authentication token.',
        status: 401,
      },
    });
    return;
  }

  // Fallback internal server error (never leak stack trace or internal secrets!)
  console.error('Unhandled Application Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred.',
      status: 500,
    },
  });
}
