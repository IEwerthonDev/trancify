# Trancify — Architecture

## Overview

Trancify is a **multi-tenant SaaS** scheduling platform for Black hair braiding salons (trancistas) in Brazil. Built as a pnpm monorepo with a React + Vite frontend, Express API, and PostgreSQL database.

---

## Project Structure

```
trancify/
├── artifacts/
│   ├── api-server/        # Express 5 API (porta 8080, proxy em /api)
│   ├── trancify/          # React + Vite frontend (porta 5173, proxy em /)
│   └── mockup-sandbox/    # Sandbox de componentes para Canvas do Replit
├── lib/
│   ├── api-spec/          # OpenAPI 3.1 + configuração Orval (codegen)
│   ├── api-client-react/  # React Query hooks gerados automaticamente
│   ├── api-zod/           # Schemas Zod gerados automaticamente
│   └── db/                # Schema Drizzle ORM + configuração do banco
├── scripts/
│   └── src/seed.ts        # Popula banco com super admin + tenant demo
├── package.json           # Raiz do monorepo pnpm
├── pnpm-workspace.yaml    # Definição dos workspaces
└── replit.md              # Documentação do projeto + preferências
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
| Notificações  | Z-API (WhatsApp) — opcional                 |
| Storage       | Google Cloud Storage — opcional             |

---

## Fluxo de Dados

```
Browser
  └─► Vite Dev Server (:5173)
        ├─► Assets estáticos (React, CSS, JS)
        └─► /api/* → Express API (:8080)
              └─► PostgreSQL
```

---

## Autenticação

- JWT armazenado em `localStorage` com chave `trancify_token`
- Dois papéis: `super_admin` e `tenant`
- Middleware `requireAuth` valida o token em todas as rotas protegidas
- Token inclui: `userId`, `email`, `role`, `tenantId`, `tenantSlug`

---

## Multi-tenancy

- Cada salão é um **tenant** identificado por `slug` único (ex.: `/naira`)
- Dados isolados por `tenantId` em todas as tabelas
- Super Admin tem acesso global via painel `/admin`

---

## Schema do Banco (Drizzle ORM)

```
users            → id, email, passwordHash, role, tenantId
tenants          → id, slug, name, whatsapp, logoUrl, colors
services         → id, tenantId, name, durationMin, priceSmall, priceLarge
availability     → id, tenantId, dayOfWeek, startTime, endTime, maxAppointments
appointments     → id, tenantId, serviceId, clientName, clientPhone, date, startTime, endTime, materialCost, photoUrls
```

---

## Regras de Negócio

- **Disponibilidade padrão**: Seg–Sáb, 08:00–17:00, slots de 30 min
- **Intervalo**: 90 min de bloqueio após cada atendimento
- **Limite**: máximo 2 atendimentos/dia por tenant
- **Preço**: `priceSmall` (até meio das costas) vs `priceLarge` (até cintura/bumbum)
- **Lucro**: `servicePrice - materialCost` (custo inserido pelo tenant após o serviço)

---

## API Routes

Todas as rotas sob `/api`:

| Método   | Rota                                  | Acesso         |
|----------|---------------------------------------|----------------|
| GET      | /healthz                              | Público        |
| POST     | /auth/login                           | Público        |
| POST     | /auth/logout                          | Autenticado    |
| GET      | /auth/me                              | Autenticado    |
| POST     | /auth/change-password                 | Autenticado    |
| GET      | /tenants/me                           | Tenant         |
| PATCH    | /tenants/me                           | Tenant         |
| GET      | /tenants/public/:slug                 | Público        |
| GET/POST | /services                             | Tenant         |
| PATCH    | /services/:id                         | Tenant         |
| DELETE   | /services/:id                         | Tenant         |
| GET      | /services/public/:tenantId            | Público        |
| GET      | /availability                         | Tenant         |
| PUT      | /availability                         | Tenant         |
| GET      | /availability/public/:tenantId        | Público        |
| GET      | /appointments                         | Tenant         |
| POST     | /appointments/book                    | Público        |
| PATCH    | /appointments/:id                     | Tenant         |
| DELETE   | /appointments/:id                     | Tenant         |
| PATCH    | /appointments/:id/cost                | Tenant         |
| GET      | /reports/tenant                       | Tenant         |
| GET      | /admin/tenants                        | Super Admin    |
| POST     | /admin/tenants                        | Super Admin    |
| PATCH    | /admin/tenants/:id                    | Super Admin    |
| DELETE   | /admin/tenants/:id                    | Super Admin    |
| POST     | /admin/tenants/:id/reset-password     | Super Admin    |
| GET      | /admin/stats                          | Super Admin    |

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

---

## Variáveis de Ambiente

| Variável           | Obrigatória | Descrição                          |
|--------------------|-------------|-------------------------------------|
| DATABASE_URL       | Sim         | URL do PostgreSQL (gerenciada pelo Replit) |
| JWT_SECRET         | Sim         | Segredo para assinar tokens JWT    |
| ZAPI_INSTANCE_ID   | Não         | Z-API: ID da instância WhatsApp    |
| ZAPI_TOKEN         | Não         | Z-API: token de autenticação       |
| ZAPI_CLIENT_TOKEN  | Não         | Z-API: client token (opcional)     |
| CALLMEBOT_PHONE    | Não         | Telefone para notificações         |

---

## Setup Local

```bash
pnpm install
pnpm --filter @workspace/db run push     # aplica schema no banco
pnpm --filter @workspace/scripts run seed # popula dados demo
```
