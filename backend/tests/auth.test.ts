import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { memoryDb } from '../src/config/prisma';

describe('Auth API Endpoints', () => {
  beforeAll(async () => {
    await memoryDb.seed();
  });

  it('should register a new user and organization as OWNER', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'New Founder',
        email: 'founder@newcorp.com',
        password: 'Password123!',
        organizationName: 'NewCorp SaaS',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('founder@newcorp.com');
    expect(res.body.organization.role).toBe('OWNER');
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
  });

  it('should reject registration with existing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Duplicate Founder',
        email: 'founder@newcorp.com',
        password: 'Password123!',
        organizationName: 'Duplicate Corp',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
  });

  it('should log in successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@acme.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.organization.name).toBe('Acme Corp');
    expect(res.body.organization.role).toBe('OWNER');
  });

  it('should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@acme.com',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should rotate refresh token and issue new token pair', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@acme.com',
        password: 'Password123!',
      });

    const oldRefreshToken = loginRes.body.tokens.refreshToken;

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.tokens.accessToken).toBeDefined();
    expect(refreshRes.body.tokens.refreshToken).toBeDefined();
    expect(refreshRes.body.tokens.refreshToken).not.toBe(oldRefreshToken);
  });

  it('should get current user profile with memberships', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@acme.com',
        password: 'Password123!',
      });

    const token = loginRes.body.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('owner@acme.com');
    expect(meRes.body.organizations.length).toBeGreaterThan(0);
  });

  it('should handle forgot password and reset password flow', async () => {
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'owner@acme.com' });

    expect(forgotRes.status).toBe(200);
    const resetToken = forgotRes.body.resetToken;
    expect(resetToken).toBeDefined();

    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        newPassword: 'NewPassword123!',
      });

    expect(resetRes.status).toBe(200);

    // Verify login with new password
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@acme.com',
        password: 'NewPassword123!',
      });

    expect(newLoginRes.status).toBe(200);
  });

  it('should logout and invalidate refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'owner@acme.com',
        password: 'NewPassword123!',
      });

    const refreshToken = loginRes.body.tokens.refreshToken;

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .send({ refreshToken });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logged out successfully.');

    // Verifying that revoked refresh token is rejected
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should rate limit repeated failed login attempts (429 Too Many Requests)', async () => {
    const targetEmail = 'brute-force@test.com';

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: targetEmail, password: 'WrongPassword' });
      expect(res.status).toBe(401);
    }

    // 6th attempt should be blocked by rate limiter
    const blockedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: targetEmail, password: 'WrongPassword' });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blockedRes.body.error.message).toContain('Too many failed login attempts');
  });
});
