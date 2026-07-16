# Trancify

Plataforma SaaS multi-tenant de agendamento para salões de tranças afro.

Monorepo pnpm · React 19 + Vite 7 · Express 5 · PostgreSQL + Drizzle ORM · TypeScript 5.9

## Forma recomendada: Docker

### Pré-requisitos

- Docker
- Docker Compose v2+

### Subir tudo

```bash
git clone https://github.com/IEwerthonDev/trancify.git
cd trancify
docker compose up --build -d
```

Na primeira execução o Compose:

1. Sobe o PostgreSQL
2. Aplica o schema (Drizzle push)
3. Faz seed dos dados demo
4. Sobe a API e o frontend atrás do Nginx

Acesse: **http://localhost:3000**

| Página | URL |
|--------|-----|
| Login | http://localhost:3000/login |
| Super Admin | http://localhost:3000/admin |
| Dashboard tenant | http://localhost:3000/dashboard |
| Agendamento demo | http://localhost:3000/naira |
| Healthcheck | http://localhost:3000/api/healthz |

### Credenciais demo

Ver **[SEED_CREDENTIALS.md](./SEED_CREDENTIALS.md)** — logins, CPFs, URLs e o que cada seed popula.

Resumo rápido:

| Papel | E-mail | Senha |
|-------|--------|-------|
| Super Admin | `admin@trancify.com` | `admin123` |
| Tenant demo | `demo@salaodanaira.com.br` | `tenant123` |
| CPF cliente | `12345678909` | — |

### Comandos úteis

```bash
# Logs
docker compose logs -f

# Parar
docker compose down

# Parar e apagar o banco local
docker compose down -v

# Rebuild após mudanças de código
docker compose up --build -d
```

### Variáveis opcionais

Copie `.env.example` para `.env` se quiser sobrescrever:

```bash
cp .env.example .env
```

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `JWT_SECRET` | valor local de desenvolvimento | Segredo JWT |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | URL pública |
| `CALLMEBOT_APIKEY` / `CALLMEBOT_PHONE` | vazio | WhatsApp (opcional) |

Portas no host:

- `3000` — aplicação (Nginx: frontend + proxy `/api`)
- `5433` — PostgreSQL (usuário/senha/db: `trancify`)

---

## Desenvolvimento sem Docker (avançado)

### Pré-requisitos

- Node.js 24
- pnpm 9+
- PostgreSQL 14+ (ou só o banco do Compose: `docker compose up -d db`)

O projeto bloqueia npm/Yarn. Use sempre `pnpm`.

```bash
pnpm install

export DATABASE_URL="postgresql://trancify:trancify@localhost:5433/trancify"
export JWT_SECRET="substitua-por-uma-chave-longa-e-aleatoria"

pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed

# Terminal 1 — API
PORT=8081 pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/trancify run dev
```

O frontend chama `/api` na mesma origem. Fora do Docker é necessário um proxy
reverso (ex.: Caddy na porta 3000) encaminhando `/api` para a API e o restante
para o Vite. Com Docker isso já está configurado no Nginx.

### Regenerar cliente da API

Após editar `lib/api-spec/openapi.yaml`:

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Typecheck / build

```bash
pnpm run typecheck
pnpm run build
```

## Documentação adicional

- `ARCHITECTURE.md` — arquitetura, schema e rotas
- `AGENTS.md` — regras para agentes de IA
- `SEED_CREDENTIALS.md` — logins e dados demo
- `INFINITEPAY.md` — checklist para ativar pagamentos InfinitePay
- `SETUP.md` — histórico detalhado de troubleshooting
