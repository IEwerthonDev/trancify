# Trancify — Guia para Agentes de IA

Este documento orienta agentes de IA (como Replit Agent) sobre como trabalhar neste projeto com segurança e eficiência.

---

## Identidade do Projeto

**Trancify** é uma plataforma SaaS multi-tenant de agendamento para salões de tranças afro no Brasil.  
Monorepo pnpm · React + Vite · Express 5 · PostgreSQL + Drizzle ORM · TypeScript 5.9

---

## Regras Fundamentais

### 1. Nunca editar `.replit` ou `replit.nix` diretamente
Use as skills `workflows` e `package-management` do Replit para gerenciar workflows e pacotes.

### 2. Nunca fazer hardcode de segredos
Use a skill `environment-secrets` para ler ou solicitar variáveis sensíveis. Segredos já configurados:
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — banco de dados
- `JWT_SECRET` — assinatura de tokens

### 3. Não modificar arquivos gerados por codegen
Os arquivos em `lib/api-client-react/` e `lib/api-zod/` são gerados automaticamente. Para alterá-los, modifique `lib/api-spec/openapi.yaml` e execute:
```bash
pnpm --filter @workspace/api-spec run codegen
```

### 4. Preservar isolamento multi-tenant
Toda query no banco deve filtrar por `tenantId`. Nunca retornar dados de um tenant para outro.

### 5. Auth é JWT próprio — não trocar por Replit Auth
O app usa JWT + bcrypt customizado. Não substituir por Replit Auth nem Clerk.

---

## Onde Adicionar Código

| O que fazer                      | Onde colocar                                      |
|----------------------------------|---------------------------------------------------|
| Nova rota de API                 | `artifacts/api-server/src/routes/`                |
| Registrar rota no router         | `artifacts/api-server/src/routes/index.ts`        |
| Novo endpoint → atualizar spec   | `lib/api-spec/openapi.yaml` → rodar codegen       |
| Nova página frontend             | `artifacts/trancify/src/pages/`                   |
| Novo componente UI               | `artifacts/trancify/src/components/`              |
| Novo hook React                  | `artifacts/trancify/src/hooks/`                   |
| Nova tabela no banco             | `lib/db/src/schema/` → rodar `db push`            |
| Nova lógica de negócio           | `artifacts/api-server/src/lib/`                   |
| Seed de dados demo               | `scripts/src/seed.ts`                             |
| Upload / ObjectUploader          | `lib/object-storage-web/`                         |

---

## Comandos Frequentes

```bash
# Instalar dependências
pnpm install

# Aplicar mudanças no schema do banco
pnpm --filter @workspace/db run push

# Popular banco com dados demo
pnpm --filter @workspace/scripts run seed

# Regenerar hooks e schemas após mudar openapi.yaml
pnpm --filter @workspace/api-spec run codegen

# Verificar tipos TypeScript
pnpm run typecheck
```

---

## Fluxo de Mudança Seguro

### Mudança de backend (nova rota):
1. Criar/editar arquivo em `artifacts/api-server/src/routes/`
2. Registrar a rota em `artifacts/api-server/src/routes/index.ts` (o router é montado em `app.ts` sob `/api`)
3. Atualizar `lib/api-spec/openapi.yaml`
4. Rodar codegen
5. Reiniciar o workflow `artifacts/api-server: API Server`

### Mudança de schema do banco:
1. Editar `lib/db/src/schema/`
2. Rodar `pnpm --filter @workspace/db run push`
3. Atualizar seed se necessário

### Mudança de frontend:
1. Editar arquivos em `artifacts/trancify/src/`
2. O Vite faz hot-reload automaticamente — não precisa reiniciar
3. Localmente o Vite exige `PORT` e `BASE_PATH` (ex.: `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/trancify run dev`)

---

## Credenciais de Desenvolvimento

Ver **[SEED_CREDENTIALS.md](./SEED_CREDENTIALS.md)** para a lista completa de logins, CPFs, tokens e URLs demo.

| Papel       | E-mail                      | Senha      | URL                  |
|-------------|------------------------------|------------|----------------------|
| Super Admin | admin@trancify.com           | admin123   | /login → /admin      |
| Tenant Demo | demo@salaodanaira.com.br     | tenant123  | /login → /dashboard  |
| Tenant Trial| demo@belatransa.com.br       | tenant123  | /login → /dashboard  |
| Booking     | (sem login, público)         | —          | /naira               |
| Cliente CPF | 12345678909                  | —          | /pagar/naira         |

---

## Arquitetura de Autenticação

```
POST /api/auth/login
  → valida email/senha no banco
  → retorna JWT

Frontend armazena token em localStorage como "trancify_token"
  → inclui em todas as requisições: Authorization: Bearer <token>

Middleware requireAuth:
  → verifica JWT com JWT_SECRET
  → injeta req.user = { userId, email, role, tenantId, tenantSlug }
```

---

## Padrões de Código

- **Validação**: sempre com Zod em rotas de API antes de acessar o banco
- **Erros**: retornar objetos `{ error: string, message: string }` com status HTTP correto
- **Logs**: usar `logger` do pino (nunca `console.log` em produção)
- **Queries**: sempre filtrar por `tenantId` em dados de tenant
- **Tipos**: sem `any` — usar tipos explícitos ou inferidos pelo Drizzle/Zod

---

## Integrações Externas

| Serviço              | Variáveis                                         | Comportamento sem config      |
|----------------------|---------------------------------------------------|-------------------------------|
| CallMeBot (WhatsApp) | `CALLMEBOT_APIKEY`, `CALLMEBOT_PHONE`             | Silenciosamente ignorado      |
| Google Storage       | `PUBLIC_OBJECT_SEARCH_PATHS`, `PRIVATE_OBJECT_DIR` | Upload de fotos desabilitado |
| InfinitePay          | handle por tenant (`infinitepayHandle`)           | Pagamentos em modo simulado   |

InfinitePay só é usado quando a cliente escolhe **Pix** ou **Cartão**.
**Dinheiro** é presencial. Detalhes: `INFINITEPAY.md`.

---

## Não Faça

- Expor `DATABASE_URL` ou `JWT_SECRET` em código frontend ou logs
- Usar `VITE_*` para segredos (enviados ao browser)
- Criar workflows duplicados — verificar antes com `listWorkflows()`
- Modificar arquivos em `lib/api-client-react/` ou `lib/api-zod/` manualmente
- Chamar APIs externas diretamente do frontend
- Remover filtros `tenantId` de queries de banco

---

## Skills Replit Relevantes

- `workflows` — gerenciar processos em execução
- `environment-secrets` — ler/solicitar variáveis de ambiente
- `database` — executar SQL, verificar banco
- `package-management` — instalar pacotes pnpm
- `canvas` + `mockup-sandbox` — prototipagem visual de UI
