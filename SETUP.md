# Trancify — Tutorial completo de execução

Plataforma SaaS multi-tenant de agendamento para trancistas. Monorepo pnpm com
frontend React + Vite, API Express 5 e PostgreSQL (Drizzle ORM).

Este documento contém **tudo** o que é necessário para subir o projeto do
zero em uma máquina nova (local ou Replit), incluindo as soluções para os
problemas encontrados no início desta sessão.

---

## 1. Pré-requisitos

| Ferramenta   | Versão       | Observação                                      |
| ------------ | ------------ | ----------------------------------------------- |
| Node.js      | **24.x**     | Use `nvm install 24 && nvm use 24` se preciso. |
| pnpm         | **>= 9**     | `npm i -g pnpm` (npm/yarn são bloqueados).     |
| PostgreSQL   | **>= 14**    | Local ou gerenciado (Neon, Supabase, Replit DB).|
| Git          | qualquer     | —                                               |

> ⚠️ O script `preinstall` da raiz **falha de propósito** se você usar `npm` ou
> `yarn`. Sempre use `pnpm`.

---

## 2. Clonar e instalar

```bash
git clone https://github.com/IEwerthonDev/trancify.git
cd trancify
pnpm install
```

O `pnpm install` instala todos os workspaces (`artifacts/*`, `lib/*`,
`scripts`) de uma única vez.

---

## 3. Variáveis de ambiente

Crie um arquivo `.env` na raiz (ou exporte na sua shell). Estas variáveis
são lidas tanto pela API quanto pelo Vite.

```bash
# Banco de dados (obrigatório)
DATABASE_URL=postgres://USER:PASS@HOST:5432/trancify

# JWT (obrigatório — qualquer string longa e aleatória)
JWT_SECRET=troque-isto-por-algo-bem-aleatorio

# API server
PORT=8080
NODE_ENV=development

# Frontend Vite (obrigatório — veja seção "Problemas resolvidos")
# Estes são lidos por artifacts/trancify/vite.config.ts.
# No Replit os workflows já injetam estes valores.
# Localmente, defina ANTES de rodar `pnpm --filter @workspace/trancify dev`:
#   PORT=23784 BASE_PATH=/ pnpm --filter @workspace/trancify run dev
# OU exporte uma vez na sua shell:
# export PORT=23784
# export BASE_PATH=/

# WhatsApp (opcional — Z-API). Sem isto, o agendamento funciona normalmente,
# apenas a notificação no WhatsApp é silenciosamente pulada.
ZAPI_INSTANCE_ID=
ZAPI_TOKEN=
ZAPI_CLIENT_TOKEN=
```

### Criando o banco local

```bash
createdb trancify
# ou via psql:
psql -c "CREATE DATABASE trancify;"
```

No Replit, abra a aba **Database** e habilite o PostgreSQL — a variável
`DATABASE_URL` já é exposta automaticamente ao ambiente.

---

## 4. Aplicar o schema no banco (Drizzle push)

Cria todas as tabelas (users, tenants, services, availability, appointments,
reviews, clients, etc.) a partir das definições em `lib/db/src/schema/`.

```bash
pnpm --filter @workspace/db run push
```

Se aparecer um prompt do drizzle-kit perguntando sobre destruição de dados em
um banco vazio, pode aceitar. Para um “force push” não interativo:

```bash
pnpm --filter @workspace/db run push-force
```

---

## 5. Rodar o seed (admin + tenant de demonstração)

Popula a base com o super-admin, um tenant de exemplo (“Salão da Naíra”) e
9 serviços de tranças com preços.

```bash
pnpm --filter @workspace/scripts run seed
```

Credenciais criadas:

| Papel        | E-mail                          | Senha       |
| ------------ | ------------------------------- | ----------- |
| Super admin  | `admin@trancify.com`            | `admin123`  |
| Tenant demo  | `demo@salaodanaira.com.br`      | `tenant123` |

Página pública de agendamento do tenant demo: **`/naira`**.

---

## 6. Subir os serviços (3 processos)

Abra **três terminais** (ou use os workflows do Replit, já configurados).

```bash
# Terminal 1 — API (porta 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (porta 23784)
PORT=23784 BASE_PATH=/ pnpm --filter @workspace/trancify run dev

# Terminal 3 — (opcional) Sandbox de componentes
pnpm --filter @workspace/mockup-sandbox run dev
```

Depois acesse:

- Dashboard do tenant: `http://localhost:23784/login`
- Painel super-admin: `http://localhost:23784/admin`
- Booking público demo: `http://localhost:23784/naira`
- Healthcheck da API: `http://localhost:8080/api/healthz`

### No Replit

Os workflows configurados já são:

- `artifacts/api-server: API Server` → `pnpm --filter @workspace/api-server dev`
- `artifacts/trancify: web` → `pnpm --filter @workspace/trancify dev`
- `artifacts/mockup-sandbox: Component Preview Server` → `pnpm --filter @workspace/mockup-sandbox dev`

Basta clicar em **Run** ou usar `restart_workflow` no agent.

---

## 7. Regenerar o cliente da API (após mudar o OpenAPI)

Sempre que você editar `lib/api-spec/openapi.yaml`, rode:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Isso atualiza `lib/api-client-react` (hooks React Query) e `lib/api-zod`
(schemas Zod) automaticamente.

---

## 8. Comandos úteis

```bash
# Type-check de todo o monorepo
pnpm run typecheck

# Build de tudo
pnpm run build

# Resetar e re-seedar o banco (CUIDADO: apaga tudo)
pnpm --filter @workspace/db run push-force
pnpm --filter @workspace/scripts run seed
```

---

## 9. Problemas que enfrentamos no início desta sessão (e como foram resolvidos)

Estes são os bloqueios reais que apareceram ao subir o projeto. Se você
estiver começando do zero, é provável que esbarre em alguns deles.

### 9.1. `Error: PORT environment variable is required` no Vite

**Sintoma:** o frontend (`artifacts/trancify`) crashava logo no boot com
`PORT environment variable is required` ou `BASE_PATH environment variable is
required`.

**Causa:** o `vite.config.ts` exige `PORT` e `BASE_PATH` explícitos — não há
fallback. Isso é intencional para evitar conflitos com o proxy do Replit.

**Solução:** sempre defina os dois antes do `dev`:

```bash
PORT=23784 BASE_PATH=/ pnpm --filter @workspace/trancify run dev
```

No Replit, o workflow `artifacts/trancify: web` já injeta esses valores.

### 9.2. Cores da página pública ilegíveis quando o tenant escolhia fundo escuro

**Sintoma:** ao salvar uma cor de fundo escura em **Configurações → Cores da
Página**, a página pública ficava com texto preto sobre fundo preto (ou
branco sobre branco), botões desaparecendo, calendário sem contraste etc.

**Causa:** o tema público usava um conjunto fixo de tokens claros
(`--foreground`, `--card`, `--border` etc.), independentemente da
luminosidade da cor escolhida pelo usuário. Além disso, vários elementos
usavam `text-white` hard-coded em vez de `text-primary-foreground`.

**Solução implementada:**

1. Em `artifacts/trancify/src/pages/public/booking.tsx` foram adicionadas as
   funções:
   - `hexLuminance(hex)` — cálculo WCAG da luminância relativa.
   - `adjustHslL(hsl, delta)` — ajusta a luminosidade em HSL.
   - `contrastRatio(a, b)` — razão de contraste WCAG.
   - `pickContrastHsl(hex)` — escolhe preto ou branco com maior contraste.
   - `buildPublicTheme(primary, secondary)` — monta o objeto de CSS variables
     ramificando entre **paleta clara** e **paleta escura** baseado em
     `luminância < 0.5`.
2. O wrapper do header passou de `bg-card` para `bg-background`, e os
   `text-white` em superfícies primárias viraram `text-primary-foreground`,
   herdando o contraste calculado dinamicamente.
3. O preview ao vivo em `artifacts/trancify/src/pages/dashboard/configuracoes.tsx`
   espelha a mesma lógica (`shadeHex` + `getContrastText` baseado em WCAG)
   para que o que o tenant vê no preview seja idêntico à página real.
4. Foram adicionados dois presets escuros (“Dark mode” e “Dourado luxuoso”)
   em `COLOR_PRESETS`.

### 9.3. Títulos das etapas do booking herdando cor errada no modo escuro

**Sintoma:** os `<h1>` e `<h2>` das etapas 1, 2, 3 e 4 do fluxo público
ficavam com a cor padrão do dashboard (claro) mesmo quando o tenant escolhia
fundo escuro.

**Causa:** os títulos não declaravam `text-foreground`, então herdavam a cor
global e ignoravam o tema injetado via CSS variables na página pública.

**Solução:** adicionado `text-foreground` no wrapper externo
`<div className="min-h-screen bg-background">` em `booking.tsx`, e
explicitamente nos `h1` (`tenant.name`) e `h2` de cada etapa.

### 9.4. Calendário da agenda poluído com “X agend.”

**Sintoma:** cada célula do calendário em `/dashboard/agenda` mostrava o
número do dia + um texto pequeno “X agend.” que estourava o layout em mobile.

**Solução:** em `artifacts/trancify/src/pages/dashboard/agenda.tsx` o texto
foi removido. A informação continua disponível via:

- Cor de fundo da célula (status dominante com prioridade
  `confirmed > pending > completed > expired > cancelled`).
- `title` HTML do botão, em português, ex.: “2 confirmado”.

### 9.5. Ícone “Primeiros passos” aparecia rotacionado

**Sintoma:** o ícone `Rocket` da navegação (sidebar, drawer mobile e tab bar
inferior) aparecia rotacionado `-45°`, ficando desalinhado dos outros ícones.

**Solução:** revertido o `-rotate-45` nos três pontos do
`artifacts/trancify/src/components/layout/DashboardLayout.tsx`. O ícone agora
mantém a orientação natural do `lucide-react`, centralizado igual aos
irmãos.

### 9.6. Operações destrutivas de Git bloqueadas no agent principal

**Sintoma:** o agent principal não conseguia rodar `git commit` / `git push`
direto.

**Causa:** comandos Git destrutivos exigem delegação a uma **Project Task**
em ambiente isolado, por regras de segurança da plataforma.

**Solução:** criada a task **#1 (Commit e push para main no GitHub)**, que
roda em sandbox próprio. Observação: o push para o GitHub propriamente dito
exige uma **conexão GitHub conectada** ao Replit (sem ela, o `git push`
falha com `Authentication failed`). Para conectar:

1. Painel lateral do Replit → **Integrations** → **GitHub** → **Connect**.
2. Re-rode a task #1.

---

## 10. Estrutura do projeto (referência rápida)

```text
artifacts/
├── api-server/         # Express 5 (porta 8080)
│   └── src/
│       ├── lib/        # auth.ts (JWT/bcrypt), availability.ts
│       └── routes/     # auth, tenants, services, availability,
│                       # appointments, reports, admin, reviews, clients
├── trancify/           # React + Vite (porta 23784)
│   └── src/
│       ├── hooks/      # use-auth.ts, use-toast.ts
│       ├── components/ # DashboardLayout, ui/*
│       ├── contexts/   # ThemeContext (dark/light global)
│       └── pages/      # login, dashboard/*, admin/*, public/booking
└── mockup-sandbox/     # Vite preview server p/ componentes isolados

lib/
├── api-spec/           # OpenAPI 3.1 + Orval codegen
├── api-client-react/   # React Query hooks gerados
├── api-zod/            # Schemas Zod gerados
├── db/                 # Drizzle ORM (schema + client)
└── object-storage-web/ # Helper de upload (logos, fotos de referência)

scripts/
└── src/seed.ts         # Cria super admin + tenant demo + 9 serviços
```

---

## 11. Regras de negócio (resumo)

- **Disponibilidade:** Seg–Sáb, 08:00–17:00, slots de 30 min, **90 min de
  intervalo** após cada atendimento, **máx. 2 atendimentos/dia**.
- **Preços:** `priceSmall` (até meio das costas) × `priceLarge` (até cintura
  ou bumbum).
- **Lucro:** `servicePrice − materialCost` (custo de material lançado pelo
  tenant após o atendimento).
- **Tipos de agendamento:** `appointment` (confirmado) e `pre_appointment`
  (pré-agendamento, pode pagar depois).

---

Pronto. Se algo falhar, comece sempre pelas seções **3** (variáveis),
**4** (`db push`) e **9.1** (PORT/BASE_PATH) — são os pontos onde 95% dos
problemas iniciais aparecem.
