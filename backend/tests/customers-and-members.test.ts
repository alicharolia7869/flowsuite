import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { memoryDb } from '../src/config/prisma';

describe('Customer & Member Lifecycle Integration Tests', () => {
  let ownerToken: string;
  let adminToken: string;
  let createdCustomerId: string;
  let invitedMemberId: string;

  beforeAll(async () => {
    await memoryDb.seed();

    const ownerRes = await request(app).post('/api/v1/auth/login').send({ email: 'owner@acme.com', password: 'Password123!' });
    ownerToken = ownerRes.body.tokens.accessToken;

    const adminRes = await request(app).post('/api/v1/auth/login').send({ email: 'admin@acme.com', password: 'Password123!' });
    adminToken = adminRes.body.tokens.accessToken;
  });

  it('Create, retrieve, update, and delete customer', async () => {
    // 1. Create
    const createRes = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Apex Innovations',
        email: 'contact@apex.io',
        phone: '+1 800-555-0100',
        company: 'Apex Innovations Global',
        notes: 'VIP Customer',
      });

    expect(createRes.status).toBe(201);
    createdCustomerId = createRes.body.customer.id;
    expect(createRes.body.customer.name).toBe('Apex Innovations');

    // 2. Get by ID
    const getRes = await request(app)
      .get(`/api/v1/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.customer.email).toBe('contact@apex.io');

    // 3. Update
    const updateRes = await request(app)
      .patch(`/api/v1/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        notes: 'Updated notes from admin',
        phone: '+1 800-555-0199',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.customer.notes).toBe('Updated notes from admin');

    // 4. Delete
    const delRes = await request(app)
      .delete(`/api/v1/customers/${createdCustomerId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toContain('deleted successfully');
  });

  it('Invite member, update role, and remove member', async () => {
    // 1. Invite
    const inviteRes = await request(app)
      .post('/api/v1/members/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'eva.contractor@acme.com',
        name: 'Eva Contractor',
        role: 'MEMBER',
      });

    expect(inviteRes.status).toBe(201);
    invitedMemberId = inviteRes.body.member.id;
    expect(inviteRes.body.member.email).toBe('eva.contractor@acme.com');

    // 2. Update role to MANAGER
    const roleRes = await request(app)
      .patch(`/api/v1/members/${invitedMemberId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'MANAGER' });

    expect(roleRes.status).toBe(200);
    expect(roleRes.body.member.role).toBe('MANAGER');

    // 3. Remove member
    const removeRes = await request(app)
      .delete(`/api/v1/members/${invitedMemberId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.message).toContain('removed successfully');
  });
});
