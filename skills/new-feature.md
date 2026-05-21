# Skill: Adicionar Nova Funcionalidade

Guia passo a passo para implementar uma funcionalidade completa (backend + frontend) no Trancify.

---

## Checklist geral

- [ ] Backend: rota de API criada e validada com Zod
- [ ] Backend: isolamento por `tenantId` garantido
- [ ] Spec: `lib/api-spec/openapi.yaml` atualizado
- [ ] Codegen: hooks e schemas regenerados
- [ ] Frontend: página ou componente criado em `artifacts/trancify/src/`
- [ ] Frontend: rota adicionada em `artifacts/trancify/src/App.tsx` (ou router)
- [ ] Workflows reiniciados após mudanças no backend

---

## Nova página no frontend

```
artifacts/trancify/src/pages/
├── dashboard/          # páginas do painel do tenant
│   ├── Appointments.tsx
│   ├── Services.tsx
│   └── MinhaNovaFuncionalidade.tsx  ← criar aqui
└── admin/              # páginas do super admin
```

### Estrutura base de uma página

```tsx
import { DashboardLayout } from "@/components/DashboardLayout";

export function MinhaNovaFuncionalidade() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Título</h1>
        {/* conteúdo */}
      </div>
    </DashboardLayout>
  );
}
```

---

## Adicionar rota de navegação

Localizar o arquivo de rotas do frontend (geralmente `App.tsx` ou `router.tsx`) e adicionar:

```tsx
<Route path="/dashboard/nova-funcionalidade" component={MinhaNovaFuncionalidade} />
```

---

## Adicionar link no menu lateral

O menu lateral está em `artifacts/trancify/src/components/DashboardLayout.tsx`. Adicionar o novo item à lista de navegação.

---

## Exemplos de hooks de API já disponíveis

```typescript
// Appointments
import { useGetAppointments, usePostAppointmentsBook } from "@workspace/api-client-react";

// Services
import { useGetServices, usePostServices } from "@workspace/api-client-react";

// Availability
import { useGetAvailability, usePutAvailability } from "@workspace/api-client-react";

// Reports
import { useGetReportsTenant } from "@workspace/api-client-react";
```

---

## Notificação WhatsApp (Z-API)

Para enviar uma notificação WhatsApp ao tenant quando algo acontece:

```typescript
// artifacts/api-server/src/lib/notifications.ts (arquivo existente)
import { sendWhatsAppNotification } from "../lib/notifications.js";

await sendWhatsAppNotification({
  phone: tenant.whatsapp,
  message: `Nova mensagem para o salão!`,
});
// Se ZAPI_INSTANCE_ID não estiver configurado, a função é silenciosa (não lança erro)
```

---

## Testes manuais rápidos

```bash
# Testar endpoint de API com curl
curl -s http://localhost:8080/api/healthz

# Login como tenant
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@salaodanaira.com.br","password":"tenant123"}'

# Usar o token retornado para acessar endpoints protegidos
curl -s http://localhost:8080/api/services \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```
