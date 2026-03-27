# Workspace — Trancify SaaS

## Overview

Trancify is a multi-tenant SaaS scheduling platform for Black hair braiding salons (trancistas) in Brazil. It is a pnpm monorepo with a React + Vite frontend, Express API server, and PostgreSQL database.

## Credentials (Development)

- **Super Admin**: admin@trancify.com / admin123
- **Demo Tenant**: demo@salaodanaira.com.br / tenant123
- **Client Booking Demo**: `/naira` (slug for Salão da Naíra)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/trancify, preview path: /)
- **API framework**: Express 5 (artifacts/api-server, path: /api)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod, drizzle-zod
- **Auth**: JWT (jsonwebtoken + bcryptjs), stored in localStorage as "trancify_token"
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- **Build**: esbuild (api-server), Vite (frontend)

## Architecture

```text
artifacts/
├── api-server/         # Express 5 API (port 8080, proxied at /api)
│   └── src/
│       ├── lib/        # auth.ts (JWT/bcrypt), availability.ts (slot logic)
│       └── routes/     # auth, tenants, services, availability, appointments, reports, admin
└── trancify/           # React + Vite frontend (port 23784, proxied at /)
    └── src/
        ├── hooks/      # use-auth.ts
        ├── components/ # DashboardLayout, UI components
        └── pages/      # login, dashboard/*, admin/*, public/booking
lib/
├── api-spec/           # OpenAPI 3.1 spec + Orval codegen config
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas
└── db/                 # Drizzle ORM schema (users, tenants, services, availability, appointments)
scripts/
└── src/seed.ts         # Seeds super admin + demo tenant with 9 braid services
```

## API Routes

All routes at `/api`:

- `GET /healthz` — Health check
- `POST /auth/login` — Login (tenant or super_admin)
- `POST /auth/logout` — Logout
- `GET /auth/me` — Current user info (requires auth)
- `POST /auth/change-password` — Change password (requires auth)
- `GET /tenants/me` — Current tenant profile (tenant only)
- `PATCH /tenants/me` — Update tenant profile (tenant only)
- `GET /tenants/public/:slug` — Public tenant info (no auth)
- `GET /services` — Tenant's services (tenant only)
- `POST /services` — Create service (tenant only)
- `PATCH /services/:id` — Update service (tenant only)
- `DELETE /services/:id` — Delete service (tenant only)
- `GET /services/public/:tenantId` — Public services (no auth)
- `GET /availability` — Tenant availability config (tenant only)
- `PUT /availability` — Update availability (tenant only)
- `GET /availability/public/:tenantId?date=&serviceId=` — Available slots (no auth)
- `GET /appointments` — Tenant appointments (tenant only)
- `GET /appointments/:id` — Single appointment (tenant only)
- `POST /appointments/book` — Book appointment (public, no auth)
- `PATCH /appointments/:id` — Update appointment (tenant only)
- `DELETE /appointments/:id` — Delete appointment (tenant only)
- `PATCH /appointments/:id/cost` — Update material cost (tenant only)
- `GET /reports/tenant` — Revenue report (tenant only)
- `GET /admin/tenants` — All tenants (super_admin only)
- `POST /admin/tenants` — Create tenant (super_admin only)
- `PATCH /admin/tenants/:id` — Update tenant (super_admin only)
- `DELETE /admin/tenants/:id` — Delete tenant (super_admin only)
- `POST /admin/tenants/:id/reset-password` — Reset password (super_admin only)
- `GET /admin/stats` — Platform stats (super_admin only)

## Business Rules

- **Availability**: Mon–Sat 08:00–17:00, 30-min slots, 90-min break after each appointment, max 2 appointments/day
- **Pricing**: priceSmall (até meio das costas) vs priceLarge (até cintura/bumbum)
- **Services**: 9 default braid services seeded for demo tenant
- **Profit**: servicePrice - materialCost (material cost entered by tenant after appointment)

## WhatsApp Notifications (Z-API)

When a new appointment is booked, a WhatsApp message is automatically sent to the tenant's registered phone number (with client info and reference photos). Requires a Z-API account:

- `ZAPI_INSTANCE_ID` — Your Z-API instance ID
- `ZAPI_TOKEN` — Your Z-API token
- `ZAPI_CLIENT_TOKEN` — (Optional) Your Z-API client token

If these variables are not set, the notification is silently skipped and the booking still works normally.

## Running Locally

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed
pnpm --filter @workspace/api-server run dev   # port 8080
pnpm --filter @workspace/trancify run dev     # port 23784
```

## Codegen (after OpenAPI spec changes)

```bash
pnpm --filter @workspace/api-spec run codegen
```
