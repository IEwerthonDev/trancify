# Skill: Banco de Dados — Trancify

## Quando usar
Qualquer operação relacionada ao banco PostgreSQL: criar tabelas, adicionar colunas, popular dados, consultar registros.

---

## Schema atual (`lib/db/src/schema/`)

| Tabela          | Campos principais                                                                 |
|-----------------|-----------------------------------------------------------------------------------|
| `users`         | id, email, passwordHash, role (`tenant`\|`super_admin`), tenantId                |
| `tenants`       | id, slug, name, whatsapp, logoUrl, primaryColor, secondaryColor                  |
| `services`      | id, tenantId, name, durationMin, priceSmall, priceLarge, active                  |
| `availability`  | id, tenantId, dayOfWeek (0–6), startTime, endTime, maxAppointments               |
| `appointments`  | id, tenantId, serviceId, clientName, clientPhone, date, startTime, endTime, materialCost, status, photoUrls |

---

## Adicionar nova coluna / tabela

1. Editar o arquivo em `lib/db/src/schema/`
2. Exportar pela `lib/db/src/schema/index.ts`
3. Aplicar no banco:
```bash
pnpm --filter @workspace/db run push
```
4. Atualizar o seed se necessário (`scripts/src/seed.ts`)

---

## Consultar banco diretamente

```javascript
// No code_execution do Replit Agent:
const result = await executeSql({ sqlQuery: "SELECT * FROM tenants" });
console.log(result.output);
```

---

## Popular banco com dados demo

```bash
pnpm --filter @workspace/scripts run seed
```

Cria:
- Super admin: `admin@trancify.com` / `admin123`
- Tenant demo: `demo@salaodanaira.com.br` / `tenant123` (slug: `naira`)
- 9 serviços de tranças para o tenant demo

---

## Re-popular do zero (limpar e re-seedar)

```bash
# Limpar tudo e re-aplicar schema
pnpm --filter @workspace/db run push-force
pnpm --filter @workspace/scripts run seed
```

---

## Variáveis de ambiente do banco

Todas gerenciadas pelo Replit — não editar manualmente:
- `DATABASE_URL` — URL completa de conexão
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

---

## Padrão obrigatório: filtrar por tenantId

```typescript
// CORRETO — sempre filtrar por tenant
const services = await db.select()
  .from(servicesTable)
  .where(eq(servicesTable.tenantId, req.user.tenantId));

// ERRADO — nunca retornar dados de todos os tenants para um usuário tenant
const services = await db.select().from(servicesTable);
```
