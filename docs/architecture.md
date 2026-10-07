# FlowSuite — Architectural Specification & Engineering Design

This document details the architecture, security models, data flows, and entitlement systems of **FlowSuite**, an enterprise-grade multi-tenant SaaS workspace platform.

---

## 1. Multi-Tenant Architecture & Data Isolation

### 1.1 Architecture Model: Logical Shared Database with Strict Tenant Scoping
FlowSuite employs a **single shared PostgreSQL relational database with logical tenant partitioning**. Every tenant-owned model maintains an explicit foreign-key relationship and index on `organizationId`:
- `Project.organizationId`
- `Task.organizationId`
- `Customer.organizationId`
- `Membership.organizationId`
- `Invitation.organizationId`
- `UsageCounter.organizationId`
- `AuditLog.organizationId`
- `Subscription.organizationId`

```
  ┌────────────────────────────────────────────────────────┐
  │                   PostgreSQL Database                  │
  ├────────────────────────────┬───────────────────────────┤
  │   Organization A (Acme)    │   Organization B (Stark)  │
  ├────────────────────────────┼───────────────────────────┤
  │ • Projects: [proj_alpha]   │ • Projects: [proj_iron]   │
  │ • Tasks:    [task_001]     │ • Tasks:    [task_002]    │
  │ • Members:  [mem_1, mem_2] │ • Members:  [mem_3]       │
  │ • Invoices: [inv_001]      │ • Invoices: [inv_002]     │
  └────────────────────────────┴───────────────────────────┘
```

### 1.2 Organization Resolution & Request Pipeline
Client-provided tenant identifiers (e.g. `x-organization-id`) are **never trusted blindly**. Tenant context is established through a strict server-side pipeline:

```
Incoming Request
       │
       ▼
1. Authentication Middleware (`authenticate`)
   • Validates JWT Bearer access token signature & expiration.
   • Resolves authenticated user ID (`req.user`).
       │
       ▼
2. Tenant Resolution Middleware (`requireTenantContext`)
   • Reads optional `x-organization-id` header or primary membership.
   • Executes database query:
     SELECT * FROM "Membership" WHERE "userId" = req.user.id AND "organizationId" = requestedOrgId;
   • If no membership row exists: REJECT with HTTP 403 FORBIDDEN.
   • Populates `req.tenant = { organizationId, role }`.
       │
       ▼
3. Query-Level Tenant Filtering
   • Every controller query enforces `{ where: { organizationId: req.tenant.organizationId, ... } }`.
   • Direct ID lookups (`GET /projects/:id`, `PATCH /tasks/:id`, `DELETE /customers/:id`) explicitly verify:
     WHERE id = :id AND organizationId = req.tenant.organizationId
   • Guarantees ZERO cross-tenant data leakage.
```

---

## 2. Authentication Flow & Security Controls

FlowSuite implements defense-in-depth authentication:

1. **User Registration (`POST /api/v1/auth/register`)**:
   - Collects `name`, `email`, `password`, `organizationName`.
   - Hashes passwords using salted bcrypt (`10` rounds) or Argon2. Plaintext passwords are never stored or logged.
   - Atomically provisions:
     - New `User` record
     - New `Organization` record
     - `Membership` associating user as `OWNER`
     - Default `Subscription` on the `FREE` plan (₹0/month)
     - `UsageCounter` tracking seats (1), projects (0), and API calls (0)
   - Issues short-lived JWT access token (15 minutes) and long-lived refresh token (7 days).

2. **Login & Rate Limiting (`POST /api/v1/auth/login`)**:
   - Rate-limited via Redis / in-memory sliding window: max 5 failed attempts per IP+Email within 15 minutes (`429 TOO_MANY_REQUESTS`).
   - Clears rate limit counter on successful password verification.

3. **Refresh-Token Rotation (`POST /api/v1/auth/refresh`)**:
   - Rotates refresh tokens on every refresh call: marks old token as `revoked: true` and issues a brand-new access token + refresh token pair.
   - Detects token reuse or revocation and invalidates the session.

4. **Password Reset Flow (`POST /forgot-password` & `POST /reset-password`)**:
   - Generates cryptographically secure 64-character hex tokens (`crypto.randomBytes(32)`).
   - Valid for 1 hour.
   - Upon successful reset, clears reset token and revokes all active refresh tokens for the user.

---

## 3. Server-Side RBAC (Role-Based Access Control)

FlowSuite enforces four distinct roles verified server-side via `requireRole(...)`:

| Role | Permitted Actions | Prohibited Actions |
| :--- | :--- | :--- |
| **OWNER** | • Full organization administration<br>• Manage subscription & billing<br>• Manage members & change member roles<br>• Update organization settings<br>• Delete organization | None (highest privilege within tenant) |
| **ADMIN** | • Invite team members<br>• Create and manage projects<br>• Create and manage tasks<br>• Create and manage customers<br>• View usage telemetry & audit logs | • Cannot manage billing/invoices<br>• Cannot change member roles<br>• Cannot remove members<br>• Cannot delete organization |
| **MANAGER**| • Create and manage projects<br>• Create and manage tasks<br>• Assign tasks to team members<br>• View team progress & activity | • Cannot invite or remove members<br>• Cannot view audit logs<br>• Cannot manage billing |
| **MEMBER** | • View assigned projects<br>• View assigned tasks<br>• Update status (`TODO` → `IN_PROGRESS` → `DONE`) of assigned tasks | • Cannot edit task title, description, or assignee<br>• Cannot create projects or tasks<br>• Cannot manage customers or members<br>• Cannot access billing or audit logs |

---

## 4. Subscription Model & Entitlement Engine

Hardcoding plan names inside business logic (e.g. `if (plan === "Professional")`) is strictly avoided. FlowSuite implements a **dynamic entitlement engine**:

### 4.1 Plan Specifications
All limits and features are defined in the database `Plan` model:

| Plan | Price | Seats | Projects | Monthly API Calls | Advanced Analytics |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FREE** | ₹0/month | 3 seats | 2 projects | 1,000 reqs/mo | No |
| **STARTER** | ₹499/month | 10 seats | 20 projects | 10,000 reqs/mo | No |
| **PROFESSIONAL** | ₹999/month | 50 seats | Unlimited (`-1`) | 100,000 reqs/mo | Yes |

### 4.2 Entitlement Resolver (`assertEntitlementLimit`)
When any resource is created:
1. `getOrganizationEntitlements(organizationId)` resolves active plan limits from the database.
2. The current count is calculated directly from active database records:
   - **Seat Limit**: `prisma.membership.count({ where: { organizationId } })`
   - **Project Limit**: `prisma.project.count({ where: { organizationId } })`
   - **API Request Limit**: `usageCounter.apiRequestsUsed`
3. If `current >= limit`, a `PlanLimitError` (`403 PLAN_LIMIT_REACHED`) is thrown with an actionable upgrade message (e.g. *"Your current plan allows a maximum of 2 projects. Upgrade your plan to create more projects."*).

---

## 5. Stripe Webhook & Billing Lifecycle

```
[User / OWNER] 
      │ 
      ▼ Calls POST /api/v1/billing/checkout
[FlowSuite API]
      │ 
      ▼ Creates Stripe Checkout Session (metadata: organizationId, planId)
[Stripe Hosted Checkout (Test Mode)]
      │ 
      ▼ Payment completed / webhook event dispatched
[POST /api/v1/billing/webhook]
      │ 
      ├── 1. Verifies Stripe Webhook Signature (`stripe-signature` header)
      ├── 2. Parses event type:
      │      • `checkout.session.completed` ──▶ Activates plan & records customer ID
      │      • `customer.subscription.updated` ──▶ Updates renewal date / tier
      │      • `customer.subscription.deleted` ──▶ Downgrades org to FREE plan
      ├── 3. Upserts `Subscription` record with new `planId` and `status: 'ACTIVE'`
      ├── 4. Writes `SUBSCRIPTION_UPDATED` entry into `AuditLog`
      └── 5. Returns `{ received: true }`
```

---

## 6. Immutable Audit Logging

Every security-sensitive or administrative action creates an immutable record in the `AuditLog` table:
- **Actor**: `actorId`, name, email
- **Action**: `ORGANIZATION_CREATED`, `MEMBER_INVITED`, `MEMBER_ACCEPTED_INVITATION`, `MEMBER_ROLE_CHANGED`, `MEMBER_REMOVED`, `PROJECT_CREATED`, `TASK_CREATED`, `SUBSCRIPTION_UPDATED`
- **Target**: `targetType` (`Membership`, `Project`, `Task`, `Subscription`) and `targetId`
- **Metadata**: JSON payload detailing exact before/after parameters
- **Timestamp**: UTC timestamp of event execution
- **Isolation**: Strictly tenant-scoped by `organizationId`, queryable only by `OWNER` and `ADMIN` with pagination and action filtering.
