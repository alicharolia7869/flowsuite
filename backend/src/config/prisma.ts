import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from './env';

// Memory Store for fallback / local testing when external PostgreSQL is not running
class MemoryTable<T extends { id: string; [key: string]: any }> {
  public items: T[] = [];

  async findUnique(args: { where: any; include?: any }): Promise<any | null> {
    const item = this.items.find(i => this.matchWhere(i, args.where));
    if (!item) return null;
    return this.applyInclude(item, args.include);
  }

  async findFirst(args: { where?: any; include?: any; orderBy?: any }): Promise<any | null> {
    let result = this.items.filter(i => this.matchWhere(i, args?.where));
    if (args?.orderBy) {
      result = this.applyOrderBy(result, args.orderBy);
    }
    if (result.length === 0) return null;
    return this.applyInclude(result[0], args?.include);
  }

  async findMany(args?: { where?: any; include?: any; orderBy?: any; skip?: number; take?: number }): Promise<any[]> {
    let result = this.items.filter(i => this.matchWhere(i, args?.where));
    if (args?.orderBy) {
      result = this.applyOrderBy(result, args.orderBy);
    }
    if (args?.skip) {
      result = result.slice(args.skip);
    }
    if (args?.take) {
      result = result.slice(0, args.take);
    }
    return result.map(i => this.applyInclude(i, args?.include));
  }

  async create(args: { data: any; include?: any }): Promise<any> {
    const now = new Date();
    const newItem: any = {
      id: args.data.id || Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36),
      createdAt: args.data.createdAt || now,
      updatedAt: args.data.updatedAt || now,
      ...args.data,
    };
    this.items.push(newItem);
    return this.applyInclude(newItem, args.include);
  }

  async update(args: { where: any; data: any; include?: any }): Promise<any> {
    const index = this.items.findIndex(i => this.matchWhere(i, args.where));
    if (index === -1) {
      throw new Error(`Record to update not found.`);
    }
    const current = this.items[index];
    const updated = {
      ...current,
      ...args.data,
      updatedAt: new Date(),
    };
    this.items[index] = updated;
    return this.applyInclude(updated, args.include);
  }

  async updateMany(args: { where: any; data: any }): Promise<{ count: number }> {
    let count = 0;
    for (const item of this.items) {
      if (this.matchWhere(item, args.where)) {
        Object.assign(item, args.data, { updatedAt: new Date() });
        count++;
      }
    }
    return { count };
  }

  async delete(args: { where: any }): Promise<any> {
    const index = this.items.findIndex(i => this.matchWhere(i, args.where));
    if (index === -1) {
      throw new Error(`Record to delete not found.`);
    }
    const [deleted] = this.items.splice(index, 1);
    return deleted;
  }

  async deleteMany(args?: { where?: any }): Promise<{ count: number }> {
    const before = this.items.length;
    this.items = this.items.filter(i => !this.matchWhere(i, args?.where));
    return { count: before - this.items.length };
  }

  async count(args?: { where?: any }): Promise<number> {
    if (!args?.where) return this.items.length;
    return this.items.filter(i => this.matchWhere(i, args.where)).length;
  }

  async upsert(args: { where: any; create: any; update: any; include?: any }): Promise<any> {
    const item = await this.findUnique({ where: args.where });
    if (item) {
      return this.update({ where: args.where, data: args.update, include: args.include });
    }
    return this.create({ data: args.create, include: args.include });
  }

  private matchWhere(item: any, where?: any): boolean {
    if (!where) return true;
    for (const key of Object.keys(where)) {
      if (key === 'OR' && Array.isArray(where.OR)) {
        const matchesOr = where.OR.some((orClause: any) => this.matchWhere(item, orClause));
        if (!matchesOr) return false;
        continue;
      }
      if (key === 'AND' && Array.isArray(where.AND)) {
        const matchesAnd = where.AND.every((andClause: any) => this.matchWhere(item, andClause));
        if (!matchesAnd) return false;
        continue;
      }
      if (key === 'userId_organizationId' && typeof where[key] === 'object') {
        const { userId, organizationId } = where[key];
        if (item.userId !== userId || item.organizationId !== organizationId) return false;
        continue;
      }

      const condition = where[key];
      const val = item[key];

      if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
        if ('equals' in condition && val !== condition.equals) return false;
        if ('not' in condition && val === condition.not) return false;
        if ('in' in condition && Array.isArray(condition.in) && !condition.in.includes(val)) return false;
        if ('contains' in condition) {
          const strVal = String(val || '').toLowerCase();
          const target = String(condition.contains).toLowerCase();
          if (!strVal.includes(target)) return false;
        }
        if ('gte' in condition && !(val >= condition.gte)) return false;
        if ('lte' in condition && !(val <= condition.lte)) return false;
        if ('gt' in condition && !(val > condition.gt)) return false;
        if ('lt' in condition && !(val < condition.lt)) return false;
      } else {
        if (val !== condition) return false;
      }
    }
    return true;
  }

  private applyOrderBy(items: any[], orderBy: any): any[] {
    const copy = [...items];
    const [key, dir] = Array.isArray(orderBy) 
      ? [Object.keys(orderBy[0] || {})[0], Object.values(orderBy[0] || {})[0]]
      : [Object.keys(orderBy)[0], Object.values(orderBy)[0]];

    if (!key) return copy;
    const isDesc = String(dir).toLowerCase() === 'desc';

    return copy.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return isDesc ? 1 : -1;
      if (bVal === undefined || bVal === null) return isDesc ? -1 : 1;
      if (aVal > bVal) return isDesc ? -1 : 1;
      return isDesc ? 1 : -1;
    });
  }

  private applyInclude(item: any, include?: any): any {
    if (!include) return { ...item };
    const clone = { ...item };

    if (include.user && item.userId) {
      clone.user = memoryDb.user.items.find(u => u.id === item.userId);
    }
    if (include.organization && item.organizationId) {
      clone.organization = memoryDb.organization.items.find(o => o.id === item.organizationId);
    }
    if (include.plan && item.planId) {
      clone.plan = memoryDb.plan.items.find(p => p.id === item.planId);
    }
    if (include.subscription && item.id) {
      const sub = memoryDb.subscription.items.find(s => s.organizationId === item.id);
      if (sub) {
        clone.subscription = {
          ...sub,
          plan: memoryDb.plan.items.find(p => p.id === sub.planId),
        };
      }
    }
    if (include.memberships && item.id) {
      const isUser = 'email' in item;
      const mems = isUser
        ? memoryDb.membership.items.filter(m => m.userId === item.id)
        : memoryDb.membership.items.filter(m => m.organizationId === item.id);

      clone.memberships = mems.map(m => {
        const mClone = { ...m };
        if (include.memberships.include?.organization) {
          const org = memoryDb.organization.items.find(o => o.id === m.organizationId);
          mClone.organization = org
            ? this.applyInclude(org, include.memberships.include.organization.include)
            : org;
        }
        if (include.memberships.include?.user) {
          mClone.user = memoryDb.user.items.find(u => u.id === m.userId);
        }
        return mClone;
      });
    }
    if (include.projects && item.id) {
      clone.projects = memoryDb.project.items.filter(p => p.organizationId === item.id);
    }
    if (include.tasks && item.id) {
      clone.tasks = memoryDb.task.items.filter(t => t.organizationId === item.id);
    }
    if (include.assignee && item.assigneeId) {
      clone.assignee = memoryDb.user.items.find(u => u.id === item.assigneeId);
    }
    if (include.actor && item.actorId) {
      clone.actor = memoryDb.user.items.find(u => u.id === item.actorId);
    }
    if (include.customers && item.id) {
      clone.customers = memoryDb.customer.items.filter(c => c.organizationId === item.id);
    }

    return clone;
  }
}

export class MemoryDatabase {
  user = new MemoryTable<any>();
  organization = new MemoryTable<any>();
  membership = new MemoryTable<any>();
  plan = new MemoryTable<any>();
  subscription = new MemoryTable<any>();
  project = new MemoryTable<any>();
  task = new MemoryTable<any>();
  customer = new MemoryTable<any>();
  usageCounter = new MemoryTable<any>();
  auditLog = new MemoryTable<any>();
  refreshToken = new MemoryTable<any>();

  async $connect() {
    return Promise.resolve();
  }

  async $disconnect() {
    return Promise.resolve();
  }

  async $transaction(callback: (db: MemoryDatabase) => Promise<any>) {
    return await callback(this);
  }

  async seed() {
    if (this.plan.items.length > 0) return; // already seeded

    const passwordHash = await bcrypt.hash('Password123!', 10);
    const now = new Date();
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 1. Seed Plans
    const freePlan = await this.plan.create({
      data: {
        id: 'plan_free_001',
        name: 'FREE',
        price: 0,
        seatLimit: 3,
        projectLimit: 2,
        apiRequestLimit: 1000,
        advancedAnalytics: false,
      }
    });

    const starterPlan = await this.plan.create({
      data: {
        id: 'plan_starter_002',
        name: 'STARTER',
        price: 499,
        seatLimit: 10,
        projectLimit: 20,
        apiRequestLimit: 10000,
        advancedAnalytics: false,
      }
    });

    const proPlan = await this.plan.create({
      data: {
        id: 'plan_pro_003',
        name: 'PROFESSIONAL',
        price: 999,
        seatLimit: 50,
        projectLimit: -1,
        apiRequestLimit: 100000,
        advancedAnalytics: true,
      }
    });

    // 2. Org 1: Acme Corp (STARTER)
    const acmeOrg = await this.organization.create({
      data: {
        id: 'org_acme_001',
        name: 'Acme Corp',
        status: 'ACTIVE',
      }
    });

    await this.subscription.create({
      data: {
        id: 'sub_acme_001',
        organizationId: acmeOrg.id,
        planId: starterPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        renewalDate: nextMonth,
        stripeCustomerId: 'cus_acme_mock123',
        stripeSubscriptionId: 'sub_acme_stripe123',
      }
    });

    await this.usageCounter.create({
      data: {
        id: 'usage_acme_001',
        organizationId: acmeOrg.id,
        seatsUsed: 4,
        projectsUsed: 2,
        apiRequestsUsed: 142,
        resetDate: nextMonth,
      }
    });

    const aliceOwner = await this.user.create({
      data: {
        id: 'usr_alice_001',
        name: 'Alice Owner',
        email: 'owner@acme.com',
        passwordHash,
      }
    });

    const bobAdmin = await this.user.create({
      data: {
        id: 'usr_bob_002',
        name: 'Bob Admin',
        email: 'admin@acme.com',
        passwordHash,
      }
    });

    const charlieManager = await this.user.create({
      data: {
        id: 'usr_charlie_003',
        name: 'Charlie Manager',
        email: 'manager@acme.com',
        passwordHash,
      }
    });

    const dianaMember = await this.user.create({
      data: {
        id: 'usr_diana_004',
        name: 'Diana Member',
        email: 'member@acme.com',
        passwordHash,
      }
    });

    await this.membership.create({ data: { id: 'mem_1', userId: aliceOwner.id, organizationId: acmeOrg.id, role: 'OWNER' } });
    await this.membership.create({ data: { id: 'mem_2', userId: bobAdmin.id, organizationId: acmeOrg.id, role: 'ADMIN' } });
    await this.membership.create({ data: { id: 'mem_3', userId: charlieManager.id, organizationId: acmeOrg.id, role: 'MANAGER' } });
    await this.membership.create({ data: { id: 'mem_4', userId: dianaMember.id, organizationId: acmeOrg.id, role: 'MEMBER' } });

    const pAlpha = await this.project.create({
      data: {
        id: 'proj_alpha_001',
        organizationId: acmeOrg.id,
        name: 'Project Alpha - CRM Overhaul',
        description: 'Modernizing enterprise CRM workflows and client dashboards.',
        status: 'IN_PROGRESS',
      }
    });

    const pBeta = await this.project.create({
      data: {
        id: 'proj_beta_002',
        organizationId: acmeOrg.id,
        name: 'Project Beta - Mobile App Redesign',
        description: 'Next generation native mobile experience for customers.',
        status: 'PLANNING',
      }
    });

    await this.task.create({
      data: {
        id: 'task_001',
        organizationId: acmeOrg.id,
        projectId: pAlpha.id,
        assigneeId: dianaMember.id,
        title: 'Design Authentication Wireframes',
        description: 'Review JWT auth states and responsive layouts.',
        status: 'TODO',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      }
    });

    await this.task.create({
      data: {
        id: 'task_002',
        organizationId: acmeOrg.id,
        projectId: pAlpha.id,
        assigneeId: dianaMember.id,
        title: 'Setup Database Schemas & Isolation',
        description: 'Enforce tenant isolation on all queries.',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      }
    });

    await this.task.create({
      data: {
        id: 'task_003',
        organizationId: acmeOrg.id,
        projectId: pBeta.id,
        assigneeId: bobAdmin.id,
        title: 'Deploy API to Staging',
        description: 'Configure Docker compose and health checks.',
        status: 'DONE',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      }
    });

    await this.customer.create({
      data: {
        id: 'cust_001',
        organizationId: acmeOrg.id,
        name: 'John Globex',
        email: 'john@globex.com',
        phone: '+1 555-0199',
        company: 'Globex Inc',
        notes: 'Enterprise client with tier-1 SLA expectations.',
        projectId: pAlpha.id,
      }
    });

    await this.customer.create({
      data: {
        id: 'cust_002',
        organizationId: acmeOrg.id,
        name: 'Peter Initech',
        email: 'peter@initech.com',
        phone: '+1 555-0142',
        company: 'Initech LLC',
        notes: 'Interested in advanced analytics capabilities.',
      }
    });

    await this.auditLog.create({
      data: {
        id: 'audit_001',
        organizationId: acmeOrg.id,
        actorId: aliceOwner.id,
        action: 'ORGANIZATION_INITIALIZED',
        targetType: 'Organization',
        targetId: acmeOrg.id,
        metadata: JSON.stringify({ name: 'Acme Corp', plan: 'STARTER' }),
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
      }
    });

    await this.auditLog.create({
      data: {
        id: 'audit_002',
        organizationId: acmeOrg.id,
        actorId: aliceOwner.id,
        action: 'MEMBER_INVITED',
        targetType: 'User',
        targetId: dianaMember.id,
        metadata: JSON.stringify({ email: 'member@acme.com', role: 'MEMBER' }),
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      }
    });

    // 3. Org 2: Stark Industries (PROFESSIONAL)
    const starkOrg = await this.organization.create({
      data: {
        id: 'org_stark_002',
        name: 'Stark Industries',
        status: 'ACTIVE',
      }
    });

    await this.subscription.create({
      data: {
        id: 'sub_stark_002',
        organizationId: starkOrg.id,
        planId: proPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        renewalDate: nextMonth,
        stripeCustomerId: 'cus_stark_mock456',
        stripeSubscriptionId: 'sub_stark_stripe456',
      }
    });

    await this.usageCounter.create({
      data: {
        id: 'usage_stark_002',
        organizationId: starkOrg.id,
        seatsUsed: 3,
        projectsUsed: 2,
        apiRequestsUsed: 420,
        resetDate: nextMonth,
      }
    });

    const tonyOwner = await this.user.create({
      data: {
        id: 'usr_tony_005',
        name: 'Tony Stark',
        email: 'owner@stark.com',
        passwordHash,
      }
    });

    const pepperAdmin = await this.user.create({
      data: {
        id: 'usr_pepper_006',
        name: 'Pepper Potts',
        email: 'admin@stark.com',
        passwordHash,
      }
    });

    const peterMember = await this.user.create({
      data: {
        id: 'usr_peter_007',
        name: 'Peter Parker',
        email: 'member@stark.com',
        passwordHash,
      }
    });

    await this.membership.create({ data: { id: 'mem_5', userId: tonyOwner.id, organizationId: starkOrg.id, role: 'OWNER' } });
    await this.membership.create({ data: { id: 'mem_6', userId: pepperAdmin.id, organizationId: starkOrg.id, role: 'ADMIN' } });
    await this.membership.create({ data: { id: 'mem_7', userId: peterMember.id, organizationId: starkOrg.id, role: 'MEMBER' } });

    const pArmor = await this.project.create({
      data: {
        id: 'proj_armor_003',
        organizationId: starkOrg.id,
        name: 'Mark 85 Armor Diagnostic',
        description: 'Telemetry analysis and nano-tech structural integrity reports.',
        status: 'IN_PROGRESS',
      }
    });

    await this.project.create({
      data: {
        id: 'proj_energy_004',
        organizationId: starkOrg.id,
        name: 'Clean Energy Grid Expansion',
        description: 'New York City Arc Reactor infrastructure integration.',
        status: 'COMPLETED',
      }
    });

    await this.task.create({
      data: {
        id: 'task_stark_001',
        organizationId: starkOrg.id,
        projectId: pArmor.id,
        assigneeId: peterMember.id,
        title: 'Calibrate Arc Reactor Sensors',
        description: 'Inspect pulse frequency jitter under high loads.',
        status: 'TODO',
      }
    });

    await this.customer.create({
      data: {
        id: 'cust_stark_001',
        organizationId: starkOrg.id,
        name: 'Nick Fury',
        email: 'fury@shield.gov',
        company: 'Avengers Initiative',
        notes: 'Priority high-level military liaison.',
      }
    });

    // 4. Org 3: Wayne Enterprises (FREE - at 2/2 project limit to test PLAN_LIMIT_REACHED)
    const wayneOrg = await this.organization.create({
      data: {
        id: 'org_wayne_003',
        name: 'Wayne Enterprises',
        status: 'ACTIVE',
      }
    });

    await this.subscription.create({
      data: {
        id: 'sub_wayne_003',
        organizationId: wayneOrg.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        renewalDate: nextMonth,
      }
    });

    await this.usageCounter.create({
      data: {
        id: 'usage_wayne_003',
        organizationId: wayneOrg.id,
        seatsUsed: 3,
        projectsUsed: 2,
        apiRequestsUsed: 12,
        resetDate: nextMonth,
      }
    });

    const bruceOwner = await this.user.create({
      data: {
        id: 'usr_bruce_008',
        name: 'Bruce Wayne',
        email: 'owner@wayne.com',
        passwordHash,
      }
    });

    const luciusAdmin = await this.user.create({
      data: {
        id: 'usr_lucius_009',
        name: 'Lucius Fox',
        email: 'admin@wayne.com',
        passwordHash,
      }
    });

    const dickMember = await this.user.create({
      data: {
        id: 'usr_dick_010',
        name: 'Dick Grayson',
        email: 'member@wayne.com',
        passwordHash,
      }
    });

    await this.membership.create({ data: { id: 'mem_8', userId: bruceOwner.id, organizationId: wayneOrg.id, role: 'OWNER' } });
    await this.membership.create({ data: { id: 'mem_9', userId: luciusAdmin.id, organizationId: wayneOrg.id, role: 'ADMIN' } });
    await this.membership.create({ data: { id: 'mem_10', userId: dickMember.id, organizationId: wayneOrg.id, role: 'MEMBER' } });

    await this.project.create({
      data: {
        id: 'proj_batmobile_005',
        organizationId: wayneOrg.id,
        name: 'Batmobile Maintenance',
        description: 'Armor plating and jet turbine tune-up.',
        status: 'IN_PROGRESS',
      }
    });

    await this.project.create({
      data: {
        id: 'proj_batcave_006',
        organizationId: wayneOrg.id,
        name: 'Batcave Surveillance',
        description: 'High-bandwidth satellite uplink integration.',
        status: 'PLANNING',
      }
    });
  }
}

export const memoryDb = new MemoryDatabase();

// Eagerly initiate in-memory database seeding so mock data is immediately ready
const seedPromise = memoryDb.seed();

const isLocalhostDb = !env.DATABASE_URL || env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1');
const shouldUseMemoryDb = process.env.FORCE_MEMORY_DB || (Boolean(process.env.VERCEL) && isLocalhostDb);

// Attempt PostgreSQL client connection, or fallback to memoryDb
let activeClient: any = memoryDb;

if (process.env.NODE_ENV !== 'test' && env.DATABASE_URL && !shouldUseMemoryDb) {
  try {
    const realPrisma = new PrismaClient({
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
    });

    // Check if Postgres is actively responsive within 1000ms
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('DB Timeout')), 1000));
    Promise.race([realPrisma.$connect(), timeout])
      .then(() => {
        console.log('Connected to PostgreSQL database successfully.');
        activeClient = realPrisma;
      })
      .catch(() => {
        console.log('PostgreSQL database server not reachable. Initializing high-speed in-memory database store.');
        activeClient = memoryDb;
      });
  } catch {
    activeClient = memoryDb;
  }
} else {
  activeClient = memoryDb;
}

// Proxied prisma export allowing dynamic dispatch
export const prisma: PrismaClient = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === '$connect') return () => (activeClient.$connect ? activeClient.$connect() : Promise.resolve());
    if (prop === '$disconnect') return () => (activeClient.$disconnect ? activeClient.$disconnect() : Promise.resolve());
    if (prop === '$transaction') return (cb: any) => activeClient.$transaction(cb);

    const client: any = activeClient || memoryDb;
    const targetTable = client[prop] || (memoryDb as any)[prop];
    if (!targetTable || typeof targetTable !== 'object') return targetTable;

    // Wrap table methods to ensure seeding is completed when using memoryDb
    return new Proxy(targetTable, {
      get(t: any, method) {
        const fn = t[method];
        if (typeof fn !== 'function') return fn;
        return async (...args: any[]) => {
          if (activeClient === memoryDb || !activeClient) {
            await seedPromise;
          }
          return fn.apply(t, args);
        };
      }
    });
  }
});
