import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { memoryDb } from '../src/config/prisma';

describe('PRD Compliance & Lifecycle Integration Test Suite', () => {
  let ownerToken: string;
  let adminToken: string;
  let managerToken: string;
  let memberToken: string;
  let orgId: string;
  let invitationToken: string;

  beforeAll(async () => {
    await memoryDb.seed();

    const ownerRes = await request(app).post('/api/v1/auth/login').send({ email: 'owner@acme.com', password: 'Password123!' });
    ownerToken = ownerRes.body.tokens.accessToken;
    orgId = ownerRes.body.organization.id;

    const adminRes = await request(app).post('/api/v1/auth/login').send({ email: 'admin@acme.com', password: 'Password123!' });
    adminToken = adminRes.body.tokens.accessToken;

    const managerRes = await request(app).post('/api/v1/auth/login').send({ email: 'manager@acme.com', password: 'Password123!' });
    managerToken = managerRes.body.tokens.accessToken;

    const memberRes = await request(app).post('/api/v1/auth/login').send({ email: 'member@acme.com', password: 'Password123!' });
    memberToken = memberRes.body.tokens.accessToken;
  });

  // ==========================================
  // INVITATIONS & ONBOARDING LIFECYCLE
  // ==========================================
  describe('Invitation & Member Lifecycle', () => {
    it('Admin can invite new member and receives secure invitation token & expiration', async () => {
      const res = await request(app)
        .post('/api/v1/members/invite')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'candidate@futurecorp.com',
          name: 'Future Candidate',
          role: 'MEMBER',
        });

      expect(res.status).toBe(201);
      expect(res.body.invitation).toBeDefined();
      expect(res.body.invitation.token).toBeDefined();
      expect(typeof res.body.invitation.token).toBe('string');
      expect(res.body.invitation.expiresAt).toBeDefined();
      expect(res.body.invitation.status).toBe('PENDING');
      invitationToken = res.body.invitation.token;
    });

    it('Public endpoint allows inspecting invitation details without authentication', async () => {
      const res = await request(app).get(`/api/v1/auth/invitations/${invitationToken}`);

      expect(res.status).toBe(200);
      expect(res.body.invitation.email).toBe('candidate@futurecorp.com');
      expect(res.body.invitation.organizationName).toBe('Acme Corp');
      expect(res.body.invitation.role).toBe('MEMBER');
      expect(res.body.invitation.status).toBe('PENDING');
    });

    it('Rejects inspection of invalid or expired invitation token', async () => {
      const res = await request(app).get('/api/v1/auth/invitations/invalid_token_12345');

      expect([400, 404]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    });

    it('New user can accept invitation, choose password, and join the organization', async () => {
      // Create a fresh invitation for an uncreated user
      const inviteRes = await request(app)
        .post('/api/v1/members/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'unregistered.hire@external.io',
          role: 'MANAGER',
        });

      const freshToken = inviteRes.body.invitation.token;

      // Accept invitation
      const acceptRes = await request(app)
        .post('/api/v1/auth/accept-invitation')
        .send({
          token: freshToken,
          name: 'Sarah Connor',
          password: 'Terminator2026!',
        });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.user.email).toBe('unregistered.hire@external.io');
      expect(acceptRes.body.organization.role).toBe('MANAGER');
      expect(acceptRes.body.tokens.accessToken).toBeDefined();

      // Verify immediate login with newly created credentials
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'unregistered.hire@external.io',
          password: 'Terminator2026!',
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.organization.role).toBe('MANAGER');
    });

    it('Enforces single organization rule: existing user in another organization cannot accept invite', async () => {
      // Stark Industries owner
      const starkOwnerEmail = 'owner@stark.com';

      // Invite Stark Owner to Acme Corp
      const inviteRes = await request(app)
        .post('/api/v1/members/invite')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'external_invitee@test.com',
          role: 'MEMBER',
        });

      const token = inviteRes.body.invitation.token;

      // Manually set invitation email to stark owner
      const inv = memoryDb.invitation.items.find(i => i.token === token);
      if (inv) inv.email = starkOwnerEmail;

      const acceptRes = await request(app)
        .post('/api/v1/auth/accept-invitation')
        .send({
          token,
          name: 'Tony Stark',
          password: 'Password123!',
        });

      expect(acceptRes.status).toBe(400);
      expect(acceptRes.body.error.code).toBe('USER_ALREADY_IN_ANOTHER_ORGANIZATION');
    });

    it('Owner and Admin can view pending invitations list', async () => {
      const res = await request(app)
        .get('/api/v1/members/invitations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.invitations)).toBe(true);
    });

    it('Manager and Member cannot view invitations list', async () => {
      const res = await request(app)
        .get('/api/v1/members/invitations')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // CONSISTENT PAGINATION ON ALL LIST ENDPOINTS
  // ==========================================
  describe('Consistent Pagination Schema (Phase 17)', () => {
    it('GET /api/v1/projects supports page and pageSize', async () => {
      const res = await request(app)
        .get('/api/v1/projects?page=1&pageSize=1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.projects).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(1);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('GET /api/v1/tasks supports page and pageSize', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?page=1&pageSize=1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.tasks).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(1);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/customers supports page and pageSize', async () => {
      const res = await request(app)
        .get('/api/v1/customers?page=1&pageSize=1')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.customers).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(1);
    });

    it('GET /api/v1/members supports page and pageSize', async () => {
      const res = await request(app)
        .get('/api/v1/members?page=1&pageSize=2')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.members).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(2);
    });

    it('GET /api/v1/audit-logs supports page and pageSize', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs?page=1&pageSize=5')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.logs).toBeDefined();
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.pageSize).toBe(5);
    });
  });

  // ==========================================
  // BILLING INVOICES & OWNER CONTROLS
  // ==========================================
  describe('Billing Invoices & History (Phase 12)', () => {
    it('OWNER can view invoices history', async () => {
      const res = await request(app)
        .get('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.invoices)).toBe(true);
      expect(res.body.invoices.length).toBeGreaterThan(0);
      expect(res.body.invoices[0].invoiceNumber).toBeDefined();
      expect(res.body.invoices[0].status).toBe('PAID');
    });

    it('ADMIN cannot access billing invoices (Owner-only control)', async () => {
      const res = await request(app)
        .get('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('MANAGER and MEMBER cannot access billing invoices', async () => {
      const managerRes = await request(app)
        .get('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(managerRes.status).toBe(403);

      const memberRes = await request(app)
        .get('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(memberRes.status).toBe(403);
    });

    it('ADMIN cannot create Stripe checkout session', async () => {
      const plansRes = await request(app).get('/api/v1/plans');
      const proPlan = plansRes.body.plans.find((p: any) => p.name === 'PROFESSIONAL');

      const res = await request(app)
        .post('/api/v1/billing/checkout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ planId: proPlan.id });

      expect(res.status).toBe(403);
    });

    it('ADMIN cannot delete organization', async () => {
      const res = await request(app)
        .delete('/api/v1/organizations/current')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ==========================================
  // PRIVILEGE ESCALATION PREVENTION
  // ==========================================
  describe('Strict Privilege Escalation Prevention', () => {
    it('MEMBER calling Admin endpoint POST /api/v1/members/invite returns 403', async () => {
      const res = await request(app)
        .post('/api/v1/members/invite')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'hack@acme.com' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('MANAGER calling OWNER endpoint PATCH /api/v1/members/:id/role returns 403', async () => {
      const res = await request(app)
        .patch('/api/v1/members/mem_4/role')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('MEMBER calling GET /api/v1/customers returns 403', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('MEMBER calling GET /api/v1/audit-logs returns 403', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
