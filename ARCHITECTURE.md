# Trancify — Architecture

## Overview

Trancify is a **multi-tenant SaaS** scheduling platform for Black hair braiding salons (trancistas) in Brazil. Built as a pnpm monorepo with a React + Vite frontend, Express API, and PostgreSQL database.

---

## Project Structure

```
trancify/
├── artifacts/
│   ├── api-server/          # Express 5 API (PORT via env; default workflow 8080)
│   ├── trancify/            # React + Vite frontend (PORT + BASE_PATH via env)
│   └── mockup-sandbox/      # Sandbox de componentes para Canvas do Replit
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 + configuração Orval (codegen)
│   ├── api-client-react/    # React Query hooks gerados automaticamente
│   ├── api-zod/             # Schemas Zod gerados automaticamente
│   ├── db/                  # Schema Drizzle ORM + configuração do banco
│   └── object-storage-web/  # ObjectUploader e helpers de upload (frontend)
├── scripts/
│   └── src/seed.ts          # Popula banco com super admin + tenant demo
├── package.json             # Raiz do monorepo pnpm
├── pnpm-workspace.yaml      # Definição dos workspaces
└── replit.md                # Documentação do projeto + preferências
```

---

## Stack

| Camada        | Tecnologia                                  |
|---------------|---------------------------------------------|
| Monorepo      | pnpm workspaces                             |
| Runtime       | Node.js 24                                  |
| Linguagem     | TypeScript 5.9                              |
| Frontend      | React 19, Vite 7, Tailwind CSS 4, Radix UI  |
| Roteamento    | Wouter                                      |
| Estado/Cache  | TanStack Query (React Query)                |
| Backend       | Express 5                                   |
| Auth          | JWT (jsonwebtoken + bcryptjs)               |
| Banco         | PostgreSQL 16 + Drizzle ORM                 |
| Validação     | Zod + drizzle-zod                           |
| Codegen       | Orval (OpenAPI → hooks + schemas)           |
| Build API     | esbuild                                     |
| Notificações  | CallMeBot (WhatsApp) — opcional             |
| Pagamentos    | InfinitePay (por tenant) — opcional         |
| Storage       | Google Cloud Storage — opcional             |

---

## Fluxo de Dados

```
Browser
  └─► Vite Dev Server (PORT + BASE_PATH via env)
        └─► Assets estáticos (React, CSS, JS)

Browser / clientes HTTP
  └─► Express API (PORT via env, rotas sob /api)
        └─► PostgreSQL
```

O frontend e a API são processos separados. No Replit, as portas padrão dos workflows são 5173 (web) e 8080 (API). O `vite.config.ts` **não** faz proxy de `/api`; a origem da API é resolvida pelo ambiente / cliente HTTP.

---

## Autenticação

- JWT armazenado em `localStorage` com chave `trancify_token`
- Dois papéis: `super_admin` e `tenant`
- Middleware `requireAuth` valida o token em rotas protegidas
- Token inclui: `userId`, `email`, `role`, `tenantId?`, `tenantSlug?`
- `POST /auth/logout` é público (noop no servidor; o cliente descarta o token)

---

## Multi-tenancy

- Cada salão é um **tenant** identificado por `slug` único (ex.: `/naira`)
- Dados isolados por `tenantId` nas tabelas de negócio
- Super Admin tem acesso global via painel `/admin`
- Relação: `tenants.userId` → `users.id` (owner do salão)

---

## Schema do Banco (Drizzle ORM)

Tabelas em `lib/db/src/schema/`:

```
users                   → id, email, passwordHash, role (tenant | super_admin)
tenants                 → id, userId, slug, name, owner/address fields, whatsapp,
                          logoUrl, infinitepayHandle, colors, status,
                          subscriptionStatus/Plan, trial/subscription dates
services                → id, tenantId, name, description, durationHours,
                          priceSmall, priceLarge, sizeDependent, active, referencePhotos
availability            → id, tenantId (unique), availableDays[], startTime, endTime,
                          slotIntervalMinutes, breakAfterMinutes, maxAppointmentsPerDay,
                          availableDates[], blockedDates[]
appointments            → id, tenantId, serviceId, serviceName, client*, paymentMethod,
                          braidSize, servicePrice, materialCost, date, time, status,
                          token, reviewToken, paymentStatus, clientCpf, deposit/paid fields
reviews                 → id, tenantId, appointmentId?, clientName, rating, comment,
                          isApproved, isPublic, token
clients                 → id, tenantId, cpf, name, phone, age, hairDescription
                          (unique tenantId+cpf)
subscription_orders     → id, tenantId, plan, amountCents, status, paymentProvider/link
pending_registrations   → cadastro incompleto (token, dados do salão, plan, expiresAt)
payment_attempts        → id, tenantId, appointmentId, orderNsu, paymentType,
                          amount, status, provider (infinitepay | simulated), checkoutUrl
```

---

## Regras de Negócio

- **Disponibilidade padrão no schema**: Seg–Sex (`availableDays: [1–5]`), 08:00–17:00, slots de 30 min
- **Intervalo**: 90 min de bloqueio após cada atendimento (`breakAfterMinutes`)
- **Limite**: máximo 2 atendimentos/dia por tenant (`maxAppointmentsPerDay`)
- **Preço**: `priceSmall` (até meio das costas) vs `priceLarge` (até cintura/bumbum)
- **Lucro**: `servicePrice - materialCost` (custo inserido pelo tenant após o serviço)
- **Assinatura**: trial padrão de 7 dias; planos `monthly` / `annual`
- **Pagamentos de agendamento**: InfinitePay se o tenant tiver `infinitepayHandle`; senão modo simulado

---

## API Routes

Todas as rotas sob `/api`. Registro em `artifacts/api-server/src/routes/index.ts`, montagem em `app.ts`.

| Método   | Rota                                      | Acesso         |
|----------|-------------------------------------------|----------------|
| GET      | /healthz                                  | Público        |
| POST     | /auth/register                            | Público        |
| GET      | /auth/register/complete/:token            | Público        |
| POST     | /auth/register/trial                      | Público        |
| POST     | /auth/login                               | Público        |
| POST     | /auth/logout                              | Público        |
| GET      | /auth/me                                  | Autenticado    |
| POST     | /auth/change-password                     | Autenticado    |
| POST     | /auth/change-email                        | Autenticado    |
| GET      | /tenants/me                               | Tenant         |
| PATCH    | /tenants/me                               | Tenant         |
| GET      | /tenants/subscription                     | Tenant         |
| POST     | /tenants/subscription/activate            | Tenant         |
| POST     | /tenants/subscription/cancel              | Tenant         |
| POST     | /tenants/subscription/pause               | Tenant         |
| GET      | /tenants/public/:slug                     | Público        |
| GET/POST | /services                                 | Tenant         |
| PATCH    | /services/:id                             | Tenant         |
| DELETE   | /services/:id                             | Tenant         |
| GET      | /services/public/:tenantId                | Público        |
| GET      | /availability                             | Tenant         |
| PUT      | /availability                             | Tenant         |
| POST     | /availability/block-range                 | Tenant         |
| POST     | /availability/unblock-range               | Tenant         |
| GET      | /availability/public/:tenantId            | Público        |
| GET      | /availability/public/:tenantId/dates      | Público        |
| GET      | /appointments                             | Tenant         |
| GET      | /appointments/:id                         | Tenant         |
| GET      | /appointments/clients/history             | Tenant         |
| POST     | /appointments/book                        | Público        |
| PATCH    | /appointments/:id                         | Tenant         |
| DELETE   | /appointments/:id                         | Tenant         |
| PATCH    | /appointments/:id/cost                    | Tenant         |
| GET      | /reports/tenant                           | Tenant         |
| GET      | /reviews                                  | Tenant         |
| PATCH    | /reviews/:id                              | Tenant         |
| DELETE   | /reviews/:id                              | Tenant         |
| GET      | /reviews/public/:tenantId                 | Público        |
| GET/POST | /reviews/submit/:token                    | Público        |
| POST     | /clients/lookup                           | Público        |
| POST     | /clients/pending-payments                 | Público        |
| POST     | /clients/history                          | Público        |
| POST     | /clients/pay                              | Público        |
| POST     | /payments/link                            | Público        |
| GET      | /payments/callback                        | Público        |
| POST     | /payments/webhook                         | Público        |
| GET      | /payments                                 | Tenant         |
| POST     | /storage/uploads/request-url              | (storage)      |
| GET      | /storage/public-objects/*                 | Público        |
| GET      | /storage/objects/*                        | (storage)      |
| GET      | /admin/tenants                            | Super Admin    |
| POST     | /admin/tenants                            | Super Admin    |
| PATCH    | /admin/tenants/:id                        | Super Admin    |
| DELETE   | /admin/tenants/:id                        | Super Admin    |
| POST     | /admin/tenants/:id/reset-password         | Super Admin    |
| GET      | /admin/stats                              | Super Admin    |

---

## Codegen (após mudanças na spec OpenAPI)

```bash
pnpm --filter @workspace/api-spec run codegen
```

Isso regenera os hooks React Query em `lib/api-client-react/` e os schemas Zod em `lib/api-zod/`.

---

## Workflows (Replit)

| Workflow                              | Porta | Descrição                    |
|---------------------------------------|-------|------------------------------|
| artifacts/trancify: web               | 5173  | Frontend React + Vite        |
| artifacts/api-server: API Server      | 8080  | API Express                  |
| artifacts/mockup-sandbox: Component Preview Server | 8081 | Canvas / Mockups  |

Fora do Replit, `PORT` (e no frontend também `BASE_PATH`) são obrigatórios via env.

---

## Variáveis de Ambiente

| Variável                     | Obrigatória | Descrição                                      |
|------------------------------|-------------|------------------------------------------------|
| DATABASE_URL                 | Sim         | URL do PostgreSQL                              |
| JWT_SECRET                   | Sim         | Segredo para assinar tokens JWT                |
| PORT                         | Sim*        | Porta do processo (API e Vite)                 |
| BASE_PATH                    | Sim*        | Base path do Vite (ex.: `/`)                   |
| CALLMEBOT_APIKEY             | Não         | CallMeBot: API key WhatsApp                    |
| CALLMEBOT_PHONE              | Não         | CallMeBot: telefone destino padrão             |
| PUBLIC_BASE_URL              | Não         | URL pública (links de pagamento / avaliações)  |
| PUBLIC_OBJECT_SEARCH_PATHS   | Não         | Paths públicos do object storage               |
| PRIVATE_OBJECT_DIR           | Não         | Diretório privado do object storage            |
| SKIP_BOOTSTRAP_SEED          | Não         | `1` para pular seed automático no boot da API  |
| LOG_LEVEL                    | Não         | Nível do pino (default `info`)                 |

\*Obrigatório nos processos Vite/API; nos workflows Replit já vem configurado.

---

## Setup Local

```bash
pnpm install
pnpm --filter @workspace/db run push      # aplica schema no banco
pnpm --filter @workspace/scripts run seed # popula dados demo

# API
PORT=8080 pnpm --filter @workspace/api-server run dev

# Frontend
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/trancify run dev
```
