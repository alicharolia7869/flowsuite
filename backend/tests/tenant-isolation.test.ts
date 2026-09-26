import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { memoryDb } from '../src/config/prisma';

describe('Strict Tenant Isolation Security Tests', () => {
  let tokenOrgA: string;
  let tokenOrgB: string;
  let orgAProject: any;
  let orgACustomer: any;
  let orgATask: any;

  beforeAll(async () => {
    await memoryDb.seed();

    // 1. Authenticate as User from Organization A (Acme Corp)
    const loginResA = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@acme.com', password: 'Password123!' });
    tokenOrgA = loginResA.body.tokens.accessToken;

    // 2. Authenticate as User from Organization B (Stark Industries)
    const loginResB = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'owner@stark.com', password: 'Password123!' });
    tokenOrgB = loginResB.body.tokens.accessToken;

    // 3. Create a Project, Task, and Customer in Organization A
    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        name: 'Confidential Defense Project A',
        description: 'Organization A internal confidential data',
        status: 'IN_PROGRESS',
      });
    orgAProject = projRes.body.project;

    const custRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        name: 'Secret Client A',
        email: 'secret@clientA.com',
        company: 'Confidential Org A Client',
      });
    orgACustomer = custRes.body.customer;

    const taskRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        projectId: orgAProject.id,
        title: 'Sensitive Org A Task',
        status: 'TODO',
      });
    orgATask = taskRes.body.task;
  });

  it('CRITICAL: Organization B user CANNOT access Organization A project', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${orgAProject.id}`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.project).toBeUndefined();
    expect(res.body.error).toBeDefined();
  });

  it('CRITICAL: Organization B project list NEVER includes Organization A projects', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect(res.status).toBe(200);
    const projectIds = res.body.projects.map((p: any) => p.id);
    expect(projectIds).not.toContain(orgAProject.id);
  });

  it('CRITICAL: Organization B user CANNOT access Organization A customer', async () => {
    const res = await request(app)
      .get(`/api/v1/customers/${orgACustomer.id}`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.customer).toBeUndefined();
    expect(res.body.error).toBeDefined();
  });

  it('CRITICAL: Organization B customer list NEVER includes Organization A customers', async () => {
    const res = await request(app)
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect(res.status).toBe(200);
    const customerIds = res.body.customers.map((c: any) => c.id);
    expect(customerIds).not.toContain(orgACustomer.id);
  });

  it('CRITICAL: Organization B user CANNOT access Organization A task', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${orgATask.id}`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.task).toBeUndefined();
    expect(res.body.error).toBeDefined();
  });

  it('CRITICAL: Organization B user CANNOT update Organization A project', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${orgAProject.id}`)
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ name: 'Hacked by Org B' });

    expect([403, 404]).toContain(res.status);
    expect(res.body.error).toBeDefined();
  });

  it('CRITICAL: Header spoofing with another org ID is rejected with 403 Forbidden', async () => {
    // Org B user attempts to pass Org A's ID in x-organization-id header
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .set('x-organization-id', orgAProject.organizationId);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
