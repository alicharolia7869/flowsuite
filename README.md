# FlowSuite — Multi-Tenant SaaS Workspace Platform

[![CI/CD](https://github.com/flowsuite/flowsuite/actions/workflows/ci.yml/badge.svg)](https://github.com/flowsuite/flowsuite/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-35%20passed-emerald)](https://github.com/flowsuite/flowsuite)
[![Coverage](https://img.shields.io/badge/coverage-77.9%25-brightgreen)](https://github.com/flowsuite/flowsuite)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**FlowSuite** is an enterprise-grade multi-tenant B2B SaaS workspace platform engineered for teams, project execution, client relationship management, dynamic plan entitlements, and Stripe test billing.

---

## 🚀 Key Highlights & Architecture

- **Strict Tenant Isolation**: Built from the ground up with SQL query-level scoping on all protected database queries. Organization A can **never** access or infer Organization B's data.
- **Server-Side RBAC**: Exact 4-tier role hierarchy (`OWNER`, `ADMIN`, `MANAGER`, `MEMBER`) enforced at the API controller layer.
- **Flexible Entitlement Engine**: Zero hardcoded plan names. Quotas (`SEAT_LIMIT`, `PROJECT_LIMIT`, `API_REQUEST_LIMIT`, `ADVANCED_ANALYTICS`) resolve dynamically through the organization's active plan.
- **Stripe Test Mode Billing**: End-to-end checkout sessions, webhook handlers, and instant test simulation.
- **Usage & Telemetry Dashboard**: Real-time seat utilization, project quotas, and API consumption charts powered by Recharts.
- **Immutable Audit Logging**: Compliance audit trail recording administrative and sensitive tenant events with JSON metadata inspection.
- **Interactive Swagger/OpenAPI Documentation**: Fully documented endpoints with request/response schemas served live at `/api/docs`.
- **Automated Test Suite**: 35 automated integration tests verifying Authentication, RBAC, Plan Limit Enforcement, Cross-Tenant Isolation, and Billing with **77.9% backend statement coverage**.

---

## 🛠 Technology Stack

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** (curated dark SaaS palette, glassmorphism, responsive layout)
- **React Router v6**
- **TanStack Query (React Query)**
- **React Hook Form**
- **Recharts** (usage & API velocity telemetry)
- **Lucide React** (modern iconography)

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **REST API architecture** with versioned endpoints (`/api/v1`)
- **PostgreSQL** + **Prisma ORM**
- **JWT** (access tokens) + **Rotating Refresh Tokens** + **bcryptjs**
- **Redis** + in-memory fallback for counters and rate limiting
- **Stripe Node SDK** (test mode)
- **Zod** schema validation
- **Swagger UI** + OpenAPI 3.0

### Testing & Infrastructure
- **Vitest** + **Supertest** + **V8 Coverage**
- **Docker** + **Docker Compose**
- **GitHub Actions** CI/CD pipeline

---

## 📁 Project Structure

```
FlowSuite/
├── backend/
│   ├── src/
│   │   ├── config/             # Environment, Prisma DB, Redis clients
│   │   ├── docs/               # OpenAPI/Swagger 3.0 specification
│   │   ├── middleware/         # Auth, Tenant isolation, RBAC, Zod, Rate Limiter, API Tracker
│   │   ├── modules/
│   │   │   ├── auth/           # Login, Register, Refresh, Password Reset
│   │   │   ├── organizations/  # Multi-tenant workspace endpoints
│   │   │   ├── members/        # Team roster, Seat limit checks, Role changes
│   │   │   ├── projects/       # Project lifecycle, Plan limit checks
│   │   │   ├── tasks/          # Task management, Member vs Manager permissions
│   │   │   ├── customers/      # Client CRM directory
│   │   │   ├── billing/        # Stripe checkout, Webhooks, Dynamic plans
│   │   │   ├── usage/          # Telemetry and quota consumption
│   │   │   └── audit/          # Immutable compliance audit log
│   │   ├── utils/              # JWT, Bcrypt, Audit logger, Entitlement Engine
│   │   ├── app.ts              # Express setup, Swagger UI, error handling
│   │   └── server.ts           # HTTP server bootstrap
│   ├── tests/                  # 35 automated integration tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/                # API client with auto-refresh on 401
│   │   ├── context/            # AuthContext (session & org switcher), ToastContext
│   │   ├── components/         # Modals, ConfirmDialogs, Badges, ProgressBars, Layout
│   │   ├── pages/              # Dashboard, Projects, Tasks, Customers, Team, Billing, Usage, Audit
│   │   ├── App.tsx             # Route declarations
│   │   └── index.css           # Tailwind design tokens
│   └── package.json
├── prisma/
│   └── schema.prisma           # Relational multi-tenant PostgreSQL schema
├── docker/
│   ├── Dockerfile.backend      # Multi-stage production container
│   ├── Dockerfile.frontend     # Nginx SPA production container
│   └── nginx.conf              # Reverse proxy & history fallback
├── .github/workflows/
│   └── ci.yml                  # GitHub Actions CI/CD test & build pipeline
├── docker-compose.yml          # Multi-container orchestration (Postgres, Redis, App)
└── README.md
```

---

## 🔑 Demo & Test Credentials

The database initializes with seed organizations and test users across all four roles:

| Organization | Plan Tier | Role | Email | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Acme Corp** | STARTER (10 seats, 20 proj) | `OWNER` | `owner@acme.com` | `Password123!` |
| **Acme Corp** | STARTER | `ADMIN` | `admin@acme.com` | `Password123!` |
| **Acme Corp** | STARTER | `MANAGER` | `manager@acme.com` | `Password123!` |
| **Acme Corp** | STARTER | `MEMBER` | `member@acme.com` | `Password123!` |
| **Stark Industries** | PROFESSIONAL (50 seats, Unlimited) | `OWNER` | `owner@stark.com` | `Password123!` |
| **Stark Industries** | PROFESSIONAL | `ADMIN` | `admin@stark.com` | `Password123!` |
| **Wayne Enterprises** | FREE (3 seats, 2 proj max) | `OWNER` | `owner@wayne.com` | `Password123!` |

> **Tip:** The Login Page features **1-Click Demo Credentials** buttons to instantly log in as any role without manual typing.

---

## ⚡ Quick Start & Local Execution

### Prerequisites
- Node.js >= 18
- npm >= 9

### 1. Install Dependencies
```bash
# From workspace root
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Run the Development Server
```bash
# Starts both Backend (port 5000) and Frontend (port 5173) concurrently
npm run dev
```

- **Frontend Application**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:5000](http://localhost:5000)
- **Interactive Swagger Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

---

## 🧪 Running Automated Tests

Run the test suite with coverage report:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **Tenant Isolation (`tests/tenant-isolation.test.ts`)**: Verifies that Organization B user is strictly rejected when attempting to access Organization A's projects, customers, or tasks; verifies header spoofing rejection.
- **RBAC (`tests/rbac.test.ts`)**: Verifies `OWNER`, `ADMIN`, `MANAGER`, and `MEMBER` permissions across all endpoints.
- **Plan Limits (`tests/plan-limits.test.ts`)**: Enforces `PLAN_LIMIT_REACHED` when attempting to create a 3rd project on the Free plan, and verifies dynamic entitlement unlocking upon plan upgrade.
- **Billing & Audit (`tests/billing-and-usage.test.ts`)**: Verifies Stripe checkout sessions, webhook handlers, and audit trail pagination.

---

## 🐳 Docker Compose Deployment

Run the complete multi-container stack:

```bash
docker compose up --build
```

Services launched:
1. `flowsuite_frontend` (Nginx serving React SPA on `http://localhost:5173`)
2. `flowsuite_backend` (Node.js API on `http://localhost:5000`)
3. `flowsuite_postgres` (PostgreSQL 15 on port `5432`)
4. `flowsuite_redis` (Redis 7 on port `6379`)

---

## 💳 Stripe Test Setup

1. In `.env`, set:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
2. Navigate to **Billing & Plans** in the FlowSuite dashboard.
3. Select **Starter** (₹499/mo) or **Professional** (₹999/mo) and click **Pay with Stripe Checkout**.
4. Use standard Stripe test card numbers (e.g. `4242 4242 4242 4242`).
5. Webhooks dispatched to `/api/v1/billing/webhook` update subscription state immediately.
6. **1-Click Simulation**: You can also use the **1-Click Test Upgrade** buttons to immediately test plan quota changes locally.
