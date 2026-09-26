import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { memoryDb } from '../src/config/prisma';

describe('Plan Limit & Entitlement Engine Enforcement Tests', () => {
  let wayneToken: string;

  beforeAll(async () => {
    await memoryDb.seed();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@wayne.com', password: 'Password123!' });
    wayneToken = loginRes.body.tokens.accessToken;
  });

  it('FREE plan: Rejects 3rd project creation when at 2 project limit', async () => {
    // Wayne Enterprises already has 2 projects seeded (batmobile and batcave)
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${wayneToken}`)
      .send({
        name: 'Batwing Overhaul (Exceeds Limit)',
        description: 'Should be rejected',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('PLAN_LIMIT_REACHED');
    expect(res.body.error.message).toContain('allows a maximum of 2 projects');
  });

  it('FREE plan: Rejects 4th member invite when at 3 seat limit', async () => {
    // Wayne Enterprises already has 3 members seeded (Bruce, Lucius, Dick)
    const res = await request(app)
      .post('/api/v1/members/invite')
      .set('Authorization', `Bearer ${wayneToken}`)
      .send({
        email: 'alfred@wayne.com',
        role: 'MEMBER',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('PLAN_LIMIT_REACHED');
    expect(res.body.error.message).toContain('allows a maximum of 3 seats');
  });

  it('Upgrading plan dynamically unlocks higher limits without restarting', async () => {
    // Simulate upgrade to PROFESSIONAL
    const upgradeRes = await request(app)
      .post('/api/v1/billing/simulate')
      .set('Authorization', `Bearer ${wayneToken}`)
      .send({ planName: 'PROFESSIONAL' });

    expect(upgradeRes.status).toBe(200);
    expect(upgradeRes.body.entitlements.isUnlimitedProjects).toBe(true);
    expect(upgradeRes.body.entitlements.seatLimit).toBe(50);
    expect(upgradeRes.body.entitlements.advancedAnalytics).toBe(true);

    // Now, creating the 3rd project must succeed!
    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${wayneToken}`)
      .send({
        name: 'Batwing Overhaul (Now Allowed)',
        description: 'Allowed under Professional Plan',
      });

    expect(projRes.status).toBe(201);
    expect(projRes.body.project.name).toBe('Batwing Overhaul (Now Allowed)');
  });
});
