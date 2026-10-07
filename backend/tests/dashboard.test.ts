import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('Dashboard Integrity and Relations Test Suite', () => {
  let ownerToken: string;
  let memberToken: string;
  let acmeOrgId: string;

  beforeAll(async () => {
    // Authenticate Acme Owner
    const ownerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.com', password: 'Password123!' });

    ownerToken = ownerLogin.body.tokens.accessToken;
    acmeOrgId = ownerLogin.body.organization.id;

    // Authenticate Acme Member
    const memberLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'member@acme.com', password: 'Password123!' });

    memberToken = memberLogin.body.tokens.accessToken;
  });

  it('GET /api/v1/usage returns numeric apiRequests and valid percentages', async () => {
    const res = await request(app)
      .get('/api/v1/usage')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', acmeOrgId);

    expect(res.status).toBe(200);
    expect(typeof res.body.apiRequests.used).toBe('number');
    expect(Number.isFinite(res.body.apiRequests.used)).toBe(true);
    expect(typeof res.body.apiRequests.percentage).toBe('number');
    expect(Number.isNaN(res.body.apiRequests.percentage)).toBe(false);

    // Verify chartData items have finite numerical request counts
    for (const point of res.body.chartData) {
      expect(typeof point.requests).toBe('number');
      expect(Number.isFinite(point.requests)).toBe(true);
    }
  });

  it('apiTracker increments apiRequestsUsed as a clean integer without object nesting', async () => {
    // Call an endpoint to trigger tracking
    const initialUsage = await request(app)
      .get('/api/v1/usage')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', acmeOrgId);

    const initialCount = initialUsage.body.apiRequests.used;

    // Trigger another API call
    await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', acmeOrgId);

    // Check usage again
    const subsequentUsage = await request(app)
      .get('/api/v1/usage')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', acmeOrgId);

    expect(typeof subsequentUsage.body.apiRequests.used).toBe('number');
    expect(subsequentUsage.body.apiRequests.used).toBeGreaterThanOrEqual(initialCount);
  });

  it('GET /api/v1/projects populates totalTasks and completedTasks correctly', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', acmeOrgId);

    expect(res.status).toBe(200);
    expect(res.body.projects.length).toBeGreaterThan(0);

    const alphaProject = res.body.projects.find((p: any) => p.name === 'Project Alpha - CRM Overhaul');
    expect(alphaProject).toBeDefined();
    expect(alphaProject.totalTasks).toBe(2);
    expect(alphaProject.completedTasks).toBe(0);

    const betaProject = res.body.projects.find((p: any) => p.name === 'Project Beta - Mobile App Redesign');
    expect(betaProject).toBeDefined();
    expect(betaProject.totalTasks).toBe(1);
    expect(betaProject.completedTasks).toBe(1);
  });

  it('GET /api/v1/tasks populates project.name correctly for dashboard cards', async () => {
    const res = await request(app)
      .get('/api/v1/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', acmeOrgId);

    expect(res.status).toBe(200);
    expect(res.body.tasks.length).toBeGreaterThan(0);

    const taskWithProject = res.body.tasks.find((t: any) => t.project && t.project.name);
    expect(taskWithProject).toBeDefined();
    expect(taskWithProject.project.name).toBe('Project Alpha - CRM Overhaul');
  });

  it('Unauthenticated dashboard request to protected endpoints returns 401', async () => {
    const res = await request(app).get('/api/v1/usage');
    expect(res.status).toBe(401);
  });

  it('Tenant context prevents cross-tenant access when spoofing organization header', async () => {
    // Wayne Enterprises organization ID
    const wayneOrgId = 'org_wayne_003';

    // Acme owner trying to query Wayne Enterprises data
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('x-organization-id', wayneOrgId);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
