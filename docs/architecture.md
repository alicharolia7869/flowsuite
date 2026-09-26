# FlowSuite — Architectural Specification

## 1. System Overview

**FlowSuite** is an enterprise-grade multi-tenant B2B SaaS workspace platform engineered with modern principles:
- **Strict Tenant Isolation**: SQL query-level scoping on all protected database queries.
- **Server-Side RBAC**: Complete authorization decisions verified on the backend, not in the client.
- **Flexible Entitlement Engine**: Dynamic limits (seats, projects, API requests, advanced analytics) resolved directly through active subscription plans.
- **Stripe Test Mode Billing**: Webhook-driven lifecycle updates with local simulation capability.
- **Immutable Audit Logging**: Compliance audit trail recording administrative and sensitive tenant events.

---

## 2. Multi-Tenancy & Strict Tenant Isolation

### 2.1 The Architectural Model
FlowSuite implements **logical database-level multi-tenancy** within a shared PostgreSQL relational database schema. Every tenant-owned table contains an indexed foreign key `organizationId`:
- `Project.organizationId`
- `Task.organizationId`
- `Customer.organizationId`
- `Membership.organizationId`
- `UsageCounter.organizationId`
- `AuditLog.organizationId`
- `Subscription.organizationId`

### 2.2 Enforcement Pipeline
Every protected request undergoes a multi-layer verification:
1. **Authentication Layer (`authenticate`)**:
   - Parses the `Authorization: Bearer <token>` header.
   - Verifies the cryptographic signature of the JWT access token.
   - Validates that the user account is active in the database.
2. **Tenant Resolution Layer (`requireTenantContext`)**:
   - Checks the `x-organization-id` header (if supplied) or falls back to the user's primary membership.
   - **Crucial**: Verifies that the authenticated `userId` possesses a verified `Membership` row for that specific `organizationId`. If not, immediately throws `403 FORBIDDEN`.
   - Populates `req.tenant = { organizationId, role }`.
3. **Query Scoping**:
   - All subsequent controllers and Prisma queries inject `{ where: { organizationId: req.tenant.organizationId, ... } }`.
   - Organization A cannot query, view, modify, or delete Organization B's entities.

---

## 3. Server-Side RBAC (Role-Based Access Control)

FlowSuite enforces four distinct roles per organization:

| Role | Permissions & Scope |
| :--- | :--- |
| **OWNER** | Full organization control, manage billing, change plans, invite/remove members, change roles, update organization settings, delete organization. |
| **ADMIN** | Manage members (invite), manage projects, manage tasks, manage customers, view analytics. Cannot manage billing or delete organization. |
| **MANAGER** | Create and manage projects, create and manage tasks, assign tasks, view team activity. Cannot manage customers or invite/remove members. |
| **MEMBER** | View assigned projects, view assigned tasks, update status of own assigned tasks (`TODO` → `IN_PROGRESS` → `DONE`). Cannot alter task title, assignee, or other members' tasks. |

---

## 4. Flexible Entitlement Engine

Hardcoding subscription checks (e.g. `if (plan === "Professional")`) is an anti-pattern in scalable SaaS systems. FlowSuite implements a dynamic entitlement resolver:

```
Organization ──▶ Active Subscription ──▶ Plan Tier ──▶ Entitlement Engine
                                                         ├── SEAT_LIMIT
                                                         ├── PROJECT_LIMIT (-1 = Unlimited)
                                                         ├── API_REQUEST_LIMIT
                                                         └── ADVANCED_ANALYTICS (Boolean)
```

- When a user performs an action (e.g., creating a project or inviting a member), `assertEntitlementLimit(organizationId, 'PROJECT_LIMIT')` runs.
- If current usage reaches or exceeds the allowed quota, the request is rejected with HTTP `403` and JSON error code `PLAN_LIMIT_REACHED`.
- Upgrading a plan dynamically raises or removes limits across all features without modifying code or restarting services.

---

## 5. Subscription & Stripe Billing System

FlowSuite implements Stripe Test Mode:
- **Checkout Session**: Initiated via `/api/v1/billing/checkout` by an `OWNER`. Attaches metadata `{ organizationId, planId }`.
- **Webhook Processing**: `/api/v1/billing/webhook` handles:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
- **1-Click Test Simulation**: To expedite automated tests and local verification without leaving the application or configuring tunnels, `/api/v1/billing/simulate` allows instant switching between `FREE`, `STARTER`, and `PROFESSIONAL`.

---

## 6. Immutable Audit Logging

Every critical administrative and tenant action records an immutable record in `AuditLog`:
- `ORGANIZATION_CREATED`
- `ORGANIZATION_UPDATED`
- `MEMBER_INVITED`
- `MEMBER_ROLE_CHANGED`
- `MEMBER_REMOVED`
- `PROJECT_CREATED`
- `PROJECT_UPDATED`
- `TASK_CREATED`
- `CUSTOMER_CREATED`
- `SUBSCRIPTION_UPDATED`

Audit logs record the `actorId`, `action`, `targetType`, `targetId`, `timestamp`, and `metadata` (JSON), viewable by `OWNER` and `ADMIN` with pagination, action filtering, and date sorting.
