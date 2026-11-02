# FlowSuite — Multi-Tenant SaaS Workspace Platform

[![CI/CD](https://github.com/flowsuite/flowsuite/actions/workflows/ci.yml/badge.svg)](https://github.com/flowsuite/flowsuite/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-81%20passed-emerald)](https://github.com/flowsuite/flowsuite)
[![Coverage](https://img.shields.io/badge/coverage-83.35%25-brightgreen)](https://github.com/flowsuite/flowsuite)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**FlowSuite** is an enterprise-grade multi-tenant B2B SaaS workspace platform engineered for teams, project execution, task workflows, customer relationship management, dynamic plan entitlements, and Stripe test billing.

---

## 1. Project Overview

FlowSuite provides organizations with an isolated collaborative cockpit featuring:
- **Authentication**: JWT access tokens, rotating refresh tokens, rate-limited login, and secure password reset.
- **Multi-Tenancy**: Logical database separation ensuring zero cross-tenant data leakage.
- **Role-Based Access Control (RBAC)**: Strict 4-tier server-side enforcement (`OWNER`, `ADMIN`, `MANAGER`, `MEMBER`).
- **Core SaaS Entities**: Projects, tasks with assignee workflows, customers, team member invitations.
- **Dynamic Entitlement Engine**: Database-driven plans (`FREE`, `STARTER`, `PROFESSIONAL`) with real-time usage quotas.
- **Stripe Test Mode Billing**: Webhook-verified checkout, upgrades, downgrades, and invoices history.
- **Telemetry & Quota Monitoring**: Live usage gauges and API request traffic trend charts.
- **Immutable Audit Logging**: Searchable and paginated event records for compliance and auditability.

---

## 2. Architecture

FlowSuite follows a decoupled client-server architecture:

```
┌────────────────────────────────────────┐
│   React 18 SPA (Vite + TailwindCSS)    │
└───────────────────┬────────────────────┘
                    │ HTTPS / REST API
                    ▼
┌────────────────────────────────────────┐
│   Express.js / TypeScript REST API     │
│   • Auth & Rate Limiter Middleware     │
│   • Tenant Resolution Middleware       │
│   • Server-Side RBAC Guard             │
│   • Entitlement Enforcement Engine     │
│   • Audit Logging Dispatcher           │
└──────────┬──────────────────┬──────────┘
           │                  │
           ▼                  ▼
┌────────────────────┐  ┌────────────────┐
│ PostgreSQL 15 (DB) │  │  Redis 7 Cache │
│ (via Prisma ORM)   │  │  & Rate Limits │
└────────────────────┘  └────────────────┘
```

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (dark mode SaaS theme, glassmorphism)
- **State & Server Cache**: TanStack React Query v5
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Icons & Charts**: Lucide React, Recharts

### Backend
- **Runtime**: Node.js 20 LTS + Express.js 4 + TypeScript 5
- **Database & ORM**: PostgreSQL 15 + Prisma ORM 5
- **Authentication**: JWT (`jsonwebtoken`), `bcryptjs`, Cookie Parser
- **Validation**: Zod schema validation
- **Caching & Limits**: Redis (`ioredis`) with memory fallback
- **Billing**: Stripe Node SDK (`v17`)
- **Documentation**: Swagger UI Express + OpenAPI 3.0

### Testing & Infrastructure
- **Tests**: Vitest 2 + Supertest 7 + V8 Coverage
- **Containerization**: Docker, Docker Compose
- **CI/CD**: GitHub Actions

---

## 4. Local Setup

### Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0
- Docker & Docker Compose (optional for containerized runs)

### Installation
Clone repository and install monorepo dependencies:

```bash
git clone https://github.com/flowsuite/flowsuite.git
cd FlowSuite
npm install
```

---

## 5. Environment Variables

Create `.env` in the repository root or use `.env.example`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database & Cache
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/flowsuite?schema=public"
REDIS_URL="redis://localhost:6379"

# Security & Tokens
JWT_SECRET="flowsuite_local_super_secret_jwt_access_key_2026"
JWT_REFRESH_SECRET="flowsuite_local_super_secret_jwt_refresh_key_2026"

# Stripe Test Mode
STRIPE_SECRET_KEY="sk_test_mockKeyForFlowSuiteDemo12345"
STRIPE_WEBHOOK_SECRET="whsec_mockSecretForFlowSuiteDemo12345"
```

---

## 6. Database Setup

Ensure PostgreSQL is running locally, or start the container:

```bash
docker compose up -d postgres redis
```

---

## 7. Migrations

Generate Prisma Client and push schema to database:

```bash
npm run prisma:generate
npm run prisma:push
```

---

## 8. Seed Data

Populate default plans (`FREE`, `STARTER`, `PROFESSIONAL`), initial organizations (`Acme Corp`, `Stark Industries`, `Wayne Enterprises`), and users for all roles:

```bash
npm run prisma:seed
```

### Pre-Seeded Test Credentials

| Organization | Plan | Role | Email | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Acme Corp** | STARTER | `OWNER` | `owner@acme.com` | `Password123!` |
| **Acme Corp** | STARTER | `ADMIN` | `admin@acme.com` | `Password123!` |
| **Acme Corp** | STARTER | `MANAGER` | `manager@acme.com` | `Password123!` |
| **Acme Corp** | STARTER | `MEMBER` | `member@acme.com` | `Password123!` |
| **Stark Industries** | PROFESSIONAL | `OWNER` | `owner@stark.com` | `Password123!` |
| **Wayne Enterprises** | FREE | `OWNER` | `owner@wayne.com` | `Password123!` |

---

## 9. Running the Frontend

To start only the frontend development server:

```bash
npm run dev:frontend
```
Access at [http://localhost:5173](http://localhost:5173).

---

## 10. Running the Backend

To start only the backend API server:

```bash
npm run dev:backend
```
Access at [http://localhost:5000](http://localhost:5000).

---

## 11. Running with Docker Compose

To build and run the full stack (PostgreSQL, Redis, Backend, Frontend) with one command:

```bash
docker compose up --build
```

Services:
- **Frontend SPA**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Swagger Docs**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Postgres**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## 12. Running Tests

Run the full Vitest automated test suite with coverage:

```bash
npm test
```

Or from backend directory:
```bash
cd backend && npm test
```

---

## 13. Test Coverage

The test suite validates:
- **Auth**: User registration, login, JWT issuance, refresh rotation, logout, password reset.
- **Multi-Tenancy**: Organization isolation, cross-tenant resource protection, header spoofing prevention.
- **RBAC**: Server-side enforcement for `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`.
- **Plan Limits**: Seat limit and project limit enforcement on the Free plan, upgrade unlock.
- **Stripe & Webhooks**: Checkout sessions, webhook verification, simulation, and invoice history.
- **Invitations**: Secure token-based onboarding, expiration checks, single-org rule.
- **Pagination**: Uniform pagination contract across all list endpoints.

**Result: 81/81 tests passing, 83.35% statement coverage (exceeds the 70% threshold).**

---

## 14. Stripe Test-Mode Setup

1. Configure Stripe API keys in `.env` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
2. Log in as an **OWNER** and visit `/billing`.
3. Select an upgrade tier and click **Pay with Stripe Checkout**.
4. Test cards: use standard `4242 4242 4242 4242`.
5. Stripe webhooks dispatch to `/api/v1/billing/webhook` and immediately update the organization's plan and entitlements.
6. **1-Click Test Upgrade**: Use the instant simulation buttons to test plan upgrades and downgrades without network hops.

---

## 15. Deployment

- **Frontend**: Deployed to Vercel production at [https://flowsuite-one.vercel.app](https://flowsuite-one.vercel.app).
- **Backend**: Containerized via Docker or deployable to any Node.js hosting platform (AWS, Railway, Render, Fly.io).

---

## 16. API Documentation

Interactive Swagger documentation is served live at `/api/docs`:
- Base URL: `http://localhost:5000/api/docs`
- Documentation format: OpenAPI 3.0 specification
- Covers all modules: Auth, Organizations, Members & Invitations, Projects, Tasks, Customers, Billing & Invoices, Usage, Audit Logs.

---

## 17. Multi-Tenancy Design

Every tenant-owned record possesses an `organizationId`. Client-supplied tenant IDs are never trusted:
1. `requireTenantContext` middleware checks the user's verified database memberships.
2. Every database query injects tenant-level filtering (`WHERE organizationId = req.tenant.organizationId`).
3. Single resource operations (`GET /projects/:id`, `PATCH /tasks/:id`) query by both entity ID and organization ID, preventing cross-tenant leakage.

---

## 18. RBAC Design

Authorization is strictly enforced server-side:
- **OWNER**: Full tenant control, billing management, role assignment, settings update, organization deletion.
- **ADMIN**: Team invitations, project/task/customer management, usage telemetry, audit logs. Prohibited from billing or organization deletion.
- **MANAGER**: Project/task/customer management and task assignment. Prohibited from inviting members or viewing audit logs.
- **MEMBER**: Read access to assigned projects and tasks; status updates on assigned tasks only. Prohibited from editing title/assignee or modifying other members' records.

---

## 19. Subscription & Entitlement Design

Plan limits are database-driven and resolved dynamically:
- **FREE**: ₹0/month, 3 seats, 2 projects, 1,000 API requests/month, no advanced analytics.
- **STARTER**: ₹499/month, 10 seats, 20 projects, 10,000 API requests/month, no advanced analytics.
- **PROFESSIONAL**: ₹999/month, 50 seats, Unlimited projects, 100,000 API requests/month, advanced analytics.

Entitlements are verified before resource creation using `assertEntitlementLimit(...)`. If a limit is reached, HTTP 403 `PLAN_LIMIT_REACHED` is returned with an actionable upgrade message.
