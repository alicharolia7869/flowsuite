import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PostgreSQL database for FlowSuite...');

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 1. Seed Plans
  const freePlan = await prisma.plan.upsert({
    where: { name: 'FREE' },
    update: {},
    create: {
      name: 'FREE',
      price: 0,
      seatLimit: 3,
      projectLimit: 2,
      apiRequestLimit: 1000,
      advancedAnalytics: false,
    },
  });

  const starterPlan = await prisma.plan.upsert({
    where: { name: 'STARTER' },
    update: {},
    create: {
      name: 'STARTER',
      price: 499,
      seatLimit: 10,
      projectLimit: 20,
      apiRequestLimit: 10000,
      advancedAnalytics: false,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: 'PROFESSIONAL' },
    update: {},
    create: {
      name: 'PROFESSIONAL',
      price: 999,
      seatLimit: 50,
      projectLimit: -1,
      apiRequestLimit: 100000,
      advancedAnalytics: true,
    },
  });

  // 2. Org 1: Acme Corp (Starter)
  const acmeOrg = await prisma.organization.upsert({
    where: { id: 'org_acme_001' },
    update: {},
    create: {
      id: 'org_acme_001',
      name: 'Acme Corp',
      status: 'ACTIVE',
    },
  });

  await prisma.subscription.upsert({
    where: { organizationId: acmeOrg.id },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      planId: starterPlan.id,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      renewalDate: nextMonth,
      stripeCustomerId: 'cus_acme_mock123',
      stripeSubscriptionId: 'sub_acme_stripe123',
    },
  });

  await prisma.usageCounter.upsert({
    where: { organizationId: acmeOrg.id },
    update: {},
    create: {
      organizationId: acmeOrg.id,
      seatsUsed: 4,
      projectsUsed: 2,
      apiRequestsUsed: 142,
      resetDate: nextMonth,
    },
  });

  // Users for Acme
  const alice = await prisma.user.upsert({
    where: { email: 'owner@acme.com' },
    update: {},
    create: { name: 'Alice Owner', email: 'owner@acme.com', passwordHash },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: { name: 'Bob Admin', email: 'admin@acme.com', passwordHash },
  });

  const charlie = await prisma.user.upsert({
    where: { email: 'manager@acme.com' },
    update: {},
    create: { name: 'Charlie Manager', email: 'manager@acme.com', passwordHash },
  });

  const diana = await prisma.user.upsert({
    where: { email: 'member@acme.com' },
    update: {},
    create: { name: 'Diana Member', email: 'member@acme.com', passwordHash },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: alice.id, organizationId: acmeOrg.id } },
    update: {},
    create: { userId: alice.id, organizationId: acmeOrg.id, role: 'OWNER' },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: bob.id, organizationId: acmeOrg.id } },
    update: {},
    create: { userId: bob.id, organizationId: acmeOrg.id, role: 'ADMIN' },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: charlie.id, organizationId: acmeOrg.id } },
    update: {},
    create: { userId: charlie.id, organizationId: acmeOrg.id, role: 'MANAGER' },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: diana.id, organizationId: acmeOrg.id } },
    update: {},
    create: { userId: diana.id, organizationId: acmeOrg.id, role: 'MEMBER' },
  });

  // Projects for Acme
  const pAlpha = await prisma.project.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Project Alpha - CRM Overhaul',
      description: 'Modernizing enterprise CRM workflows and client dashboards.',
      status: 'IN_PROGRESS',
    },
  });

  const pBeta = await prisma.project.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'Project Beta - Mobile App Redesign',
      description: 'Next generation native mobile experience for customers.',
      status: 'PLANNING',
    },
  });

  // Tasks for Acme
  await prisma.task.create({
    data: {
      organizationId: acmeOrg.id,
      projectId: pAlpha.id,
      assigneeId: diana.id,
      title: 'Design Authentication Wireframes',
      description: 'Review JWT auth states and responsive layouts.',
      status: 'TODO',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.task.create({
    data: {
      organizationId: acmeOrg.id,
      projectId: pAlpha.id,
      assigneeId: diana.id,
      title: 'Setup Database Schemas & Isolation',
      description: 'Enforce tenant isolation on all queries.',
      status: 'IN_PROGRESS',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
  });

  // Customers for Acme
  await prisma.customer.create({
    data: {
      organizationId: acmeOrg.id,
      name: 'John Globex',
      email: 'john@globex.com',
      company: 'Globex Inc',
      notes: 'Enterprise client with tier-1 SLA expectations.',
      projectId: pAlpha.id,
    },
  });

  // Org 2: Stark Industries (Professional)
  const starkOrg = await prisma.organization.upsert({
    where: { id: 'org_stark_002' },
    update: {},
    create: { id: 'org_stark_002', name: 'Stark Industries', status: 'ACTIVE' },
  });

  await prisma.subscription.upsert({
    where: { organizationId: starkOrg.id },
    update: {},
    create: {
      organizationId: starkOrg.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      renewalDate: nextMonth,
      stripeCustomerId: 'cus_stark_mock456',
      stripeSubscriptionId: 'sub_stark_stripe456',
    },
  });

  await prisma.usageCounter.upsert({
    where: { organizationId: starkOrg.id },
    update: {},
    create: {
      organizationId: starkOrg.id,
      seatsUsed: 3,
      projectsUsed: 2,
      apiRequestsUsed: 420,
      resetDate: nextMonth,
    },
  });

  const tony = await prisma.user.upsert({
    where: { email: 'owner@stark.com' },
    update: {},
    create: { name: 'Tony Stark', email: 'owner@stark.com', passwordHash },
  });
  const pepper = await prisma.user.upsert({
    where: { email: 'admin@stark.com' },
    update: {},
    create: { name: 'Pepper Potts', email: 'admin@stark.com', passwordHash },
  });
  const peter = await prisma.user.upsert({
    where: { email: 'member@stark.com' },
    update: {},
    create: { name: 'Peter Parker', email: 'member@stark.com', passwordHash },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: tony.id, organizationId: starkOrg.id } },
    update: {},
    create: { userId: tony.id, organizationId: starkOrg.id, role: 'OWNER' },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: pepper.id, organizationId: starkOrg.id } },
    update: {},
    create: { userId: pepper.id, organizationId: starkOrg.id, role: 'ADMIN' },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: peter.id, organizationId: starkOrg.id } },
    update: {},
    create: { userId: peter.id, organizationId: starkOrg.id, role: 'MEMBER' },
  });

  // Org 3: Wayne Enterprises (Free)
  const wayneOrg = await prisma.organization.upsert({
    where: { id: 'org_wayne_003' },
    update: {},
    create: { id: 'org_wayne_003', name: 'Wayne Enterprises', status: 'ACTIVE' },
  });

  await prisma.subscription.upsert({
    where: { organizationId: wayneOrg.id },
    update: {},
    create: {
      organizationId: wayneOrg.id,
      planId: freePlan.id,
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      renewalDate: nextMonth,
    },
  });

  await prisma.usageCounter.upsert({
    where: { organizationId: wayneOrg.id },
    update: {},
    create: {
      organizationId: wayneOrg.id,
      seatsUsed: 3,
      projectsUsed: 2,
      apiRequestsUsed: 12,
      resetDate: nextMonth,
    },
  });

  const bruce = await prisma.user.upsert({
    where: { email: 'owner@wayne.com' },
    update: {},
    create: { name: 'Bruce Wayne', email: 'owner@wayne.com', passwordHash },
  });

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: bruce.id, organizationId: wayneOrg.id } },
    update: {},
    create: { userId: bruce.id, organizationId: wayneOrg.id, role: 'OWNER' },
  });

  console.log('✅ PostgreSQL Database seeded successfully with multi-tenant data!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
