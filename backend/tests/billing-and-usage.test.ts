import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { memoryDb } from '../src/config/prisma';

describe('Billing, Usage Dashboard, and Audit Logs Tests', () => {
  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;

  beforeAll(async () => {
    await memoryDb.seed();

    const ownerRes = await request(app).post('/api/v1/auth/login').send({ email: 'owner@acme.com', password: 'Password123!' });
    ownerToken = ownerRes.body.tokens.accessToken;

    const adminRes = await request(app).post('/api/v1/auth/login').send({ email: 'admin@acme.com', password: 'Password123!' });
    adminToken = adminRes.body.tokens.accessToken;

    const memberRes = await request(app).post('/api/v1/auth/login').send({ email: 'member@acme.com', password: 'Password123!' });
    memberToken = memberRes.body.tokens.accessToken;
  });

  it('GET /api/v1/plans returns all subscription tiers', async () => {
    const res = await request(app).get('/api/v1/plans');
    expect(res.status).toBe(200);
    expect(res.body.plans.length).toBe(3);
    const names = res.body.plans.map((p: any) => p.name);
    expect(names).toContain('FREE');
    expect(names).toContain('STARTER');
    expect(names).toContain('PROFESSIONAL');
  });

  it('GET /api/v1/subscription returns current active plan and dynamic entitlements', async () => {
    const res = await request(app)
      .get('/api/v1/subscription')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.subscription).toBeDefined();
    expect(res.body.entitlements).toBeDefined();
    expect(res.body.entitlements.planName).toBe('STARTER');
  });

  it('POST /api/v1/billing/checkout creates a checkout session', async () => {
    const plansRes = await request(app).get('/api/v1/plans');
    const proPlan = plansRes.body.plans.find((p: any) => p.name === 'PROFESSIONAL');

    const res = await request(app)
      .post('/api/v1/billing/checkout')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ planId: proPlan.id });

    expect(res.status).toBe(200);
    expect(res.body.url).toBeDefined();
    expect(res.body.sessionId).toBeDefined();
  });

  it('POST /api/v1/billing/webhook handles completed checkout events', async () => {
    const plansRes = await request(app).get('/api/v1/plans');
    const proPlan = plansRes.body.plans.find((p: any) => p.name === 'PROFESSIONAL');

    const webhookPayload = {
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'org_acme_001',
          customer: 'cus_test_webhook_123',
          subscription: 'sub_test_webhook_123',
          metadata: {
            organizationId: 'org_acme_001',
            planId: proPlan.id,
          },
        },
      },
    };

    const res = await request(app)
      .post('/api/v1/billing/webhook')
      .send(webhookPayload);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    // Verify Acme subscription was upgraded to PROFESSIONAL
    const subRes = await request(app)
      .get('/api/v1/subscription')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(subRes.body.entitlements.planName).toBe('PROFESSIONAL');
  });

  it('GET /api/v1/usage returns real database state and progress indicators', async () => {
    const res = await request(app)
      .get('/api/v1/usage')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.seats.used).toBeGreaterThan(0);
    expect(res.body.seats.limit).toBeGreaterThan(0);
    expect(res.body.projects).toBeDefined();
    expect(res.body.apiRequests).toBeDefined();
    expect(typeof res.body.apiRequests.used).toBe('number');
    expect(Number.isNaN(res.body.apiRequests.used)).toBe(false);
    expect(Number.isNaN(res.body.apiRequests.percentage)).toBe(false);
    expect(res.body.chartData.length).toBeGreaterThan(0);
    expect(typeof res.body.chartData[0].requests).toBe('number');
    expect(Number.isNaN(res.body.chartData[0].requests)).toBe(false);
  });

  it('GET /api/v1/audit-logs allows OWNER and ADMIN access with pagination', async () => {
    const ownerRes = await request(app)
      .get('/api/v1/audit-logs?page=1&limit=10')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.logs).toBeDefined();
    expect(ownerRes.body.pagination).toBeDefined();

    const adminRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
  });

  it('GET /api/v1/audit-logs rejects MEMBER access with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
