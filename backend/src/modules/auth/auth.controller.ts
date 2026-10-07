import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { createAuditLog } from '../../utils/audit';
import { AppError } from '../../middleware/errorHandler';
import { clearLoginAttempts } from '../../middleware/rateLimiter';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, organizationName } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('An account with this email address already exists.', 'USER_ALREADY_EXISTS', 400);
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Get default FREE plan
    let freePlan = await prisma.plan.findUnique({ where: { name: 'FREE' } });
    if (!freePlan) {
      freePlan = await prisma.plan.create({
        data: {
          name: 'FREE',
          price: 0,
          seatLimit: 3,
          projectLimit: 2,
          apiRequestLimit: 1000,
          advancedAnalytics: false,
        },
      });
    }

    // Create User, Organization, Membership as OWNER, Subscription, and UsageCounter
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        status: 'ACTIVE',
      },
    });

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        renewalDate,
      },
    });

    await prisma.usageCounter.create({
      data: {
        organizationId: organization.id,
        seatsUsed: 1,
        projectsUsed: 0,
        apiRequestsUsed: 0,
        resetDate: renewalDate,
      },
    });

    // Create Refresh Token & Access Token
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      organizationId: organization.id,
      role: 'OWNER',
    });

    const refreshToken = signRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Record Audit Logs
    await createAuditLog({
      organizationId: organization.id,
      actorId: user.id,
      action: 'ORGANIZATION_CREATED',
      targetType: 'Organization',
      targetId: organization.id,
      metadata: { name: organization.name, createdBy: user.email },
    });

    res.status(201).json({
      message: 'Account and organization created successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        role: membership.role,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
    }

    // Clear failed login attempts on successful authentication
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await clearLoginAttempts(ip, normalizedEmail);

    // Pick active organization membership (default to first or active)
    const primaryMembership = user.memberships[0];
    const organizationId = primaryMembership?.organizationId;
    const role = primaryMembership?.role || 'MEMBER';

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      organizationId,
      role,
    });

    const refreshToken = signRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(200).json({
      message: 'Logged in successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      organization: primaryMembership ? {
        id: primaryMembership.organization.id,
        name: primaryMembership.organization.name,
        role: primaryMembership.role,
      } : null,
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    const decoded = verifyRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token. Please log in again.', 'UNAUTHORIZED', 401);
    }

    // Refresh token rotation: Revoke old token and issue new pair
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revoked: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found.', 'UNAUTHORIZED', 401);
    }

    const primaryMembership = user.memberships[0];
    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      organizationId: primaryMembership?.organizationId,
      role: primaryMembership?.role,
    });

    const newRefreshToken = signRefreshToken({ userId: user.id });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(200).json({
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      });
    }

    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // Return 200 to prevent user enumeration
      res.status(200).json({
        message: 'If an account exists with this email, a password reset link has been dispatched.',
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // In local development / test mode, we return the token in response for testing convenience
    res.status(200).json({
      message: 'If an account exists with this email, a password reset link has been dispatched.',
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gte: new Date() },
      },
    });

    if (!user) {
      throw new AppError('Password reset token is invalid or has expired.', 'INVALID_TOKEN', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Revoke all existing refresh tokens for security
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });

    res.status(200).json({ message: 'Password has been reset successfully. Please log in with your new password.' });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated.', 'UNAUTHORIZED', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscription: {
                  include: { plan: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found.', 'NOT_FOUND', 404);
    }

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      organizations: user.memberships.map(m => ({
        id: m.organization.id,
        name: m.organization.name,
        role: m.role,
        plan: m.organization.subscription?.plan?.name || 'STARTER',
        joinedAt: m.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}
