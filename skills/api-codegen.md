# Skill: API — Codegen e Novas Rotas

## Fluxo completo para adicionar uma nova rota de API

### 1. Criar o handler em `artifacts/api-server/src/routes/`

```typescript
// artifacts/api-server/src/routes/exemplo.ts
import { Router } from "express";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { db } from "@workspace/db";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const authReq = req as AuthRequest;
  // sempre filtrar por tenantId
  const data = await db.select()...where(eq(table.tenantId, authReq.user.tenantId));
  res.json(data);
});

export { router as exemploRouter };
```

### 2. Registrar a rota em `artifacts/api-server/src/index.ts`

```typescript
import { exemploRouter } from "./routes/exemplo.js";
app.use("/exemplo", exemploRouter);
```

### 3. Atualizar a spec OpenAPI

Editar `lib/api-spec/openapi.yaml` adicionando o novo endpoint com request/response schemas.

### 4. Rodar codegen

```bash
pnpm --filter @workspace/api-spec run codegen
```

Isso regenera automaticamente:
- `lib/api-client-react/` — hooks React Query para o frontend
- `lib/api-zod/` — schemas Zod para validação

### 5. Reiniciar a API

Reinicie o workflow `artifacts/api-server: API Server` no Replit.

---

## Usar os hooks gerados no frontend

```typescript
// Os hooks ficam em lib/api-client-react/
import { useGetExemplo } from "@workspace/api-client-react";

function MeuComponente() {
  const { data, isLoading } = useGetExemplo();
  // ...
}
```

---

## Validação de entrada com Zod (padrão do projeto)

```typescript
const schema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "ValidationError", message: parsed.error.message });
  }
  // usar parsed.data com tipos corretos
});
```

---

## Padrão de resposta de erro

```typescript
// 400 - dados inválidos
res.status(400).json({ error: "ValidationError", message: "Descrição do erro" });

// 401 - não autenticado
res.status(401).json({ error: "Unauthorized", message: "Token inválido ou expirado" });

// 403 - sem permissão
res.status(403).json({ error: "Forbidden", message: "Acesso negado" });

// 404 - não encontrado
res.status(404).json({ error: "NotFound", message: "Recurso não encontrado" });

// 500 - erro interno
res.status(500).json({ error: "InternalError", message: "Erro interno do servidor" });
```
