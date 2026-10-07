import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { memoryDb } from '../src/config/prisma';

describe('Server-Side RBAC Enforcement Tests', () => {
  let ownerToken: string;
  let adminToken: string;
  let managerToken: string;
  let memberToken: string;
  let orgId: string;
  let assignedTaskId: string;
  let unassignedTaskId: string;

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

    // Diana's assigned task: task_001 or task_002
    assignedTaskId = 'task_002';
    // Bob's assigned task: task_003
    unassignedTaskId = 'task_003';
  });

  it('OWNER can fetch current organization settings', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.organization.name).toBe('Acme Corp');
    expect(res.body.organization.id).toBe(orgId);
  });

  it('OWNER can update organization settings', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/current')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Acme Global Enterprise' });

    expect(res.status).toBe(200);
    expect(res.body.organization.name).toBe('Acme Global Enterprise');
  });

  it('Validates organization name length on update', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/current')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('Unauthenticated requests to settings endpoints return 401', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/current');

    expect(res.status).toBe(401);
  });

  it('ADMIN cannot update organization settings', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/current')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Hacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('ADMIN can invite new members', async () => {
    const res = await request(app)
      .post('/api/v1/members/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newuser_admin@acme.com',
        role: 'MEMBER',
      });

    expect(res.status).toBe(201);
  });

  it('MANAGER cannot invite members', async () => {
    const res = await request(app)
      .post('/api/v1/members/invite')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        email: 'fail_invite@acme.com',
        role: 'MEMBER',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('MEMBER cannot invite members or create projects', async () => {
    const inviteRes = await request(app)
      .post('/api/v1/members/invite')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: 'member_invite@acme.com' });

    expect(inviteRes.status).toBe(403);

    const projRes = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Unauthorized Project' });

    expect(projRes.status).toBe(403);
  });

  it('MEMBER can update the status of their assigned task', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${assignedTaskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'DONE' });

    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('DONE');
  });

  it('MEMBER cannot update another member task', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${unassignedTaskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'DONE' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('MEMBER cannot modify title or assignee on their task', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${assignedTaskId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ title: 'Altered Title by Member' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('MANAGER can create tasks and assign them', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        projectId: 'proj_alpha_001',
        title: 'Manager Assigned Task',
        assigneeId: 'usr_diana_004',
        status: 'TODO',
      });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('Manager Assigned Task');
  });
});
