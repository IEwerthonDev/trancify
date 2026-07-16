# Credenciais e acessos do seed demo

Dados criados por `pnpm --filter @workspace/scripts run seed` (também executado
automaticamente no boot da API via Docker).

Base local com Docker: **http://localhost:3000**

---

## Super Admin

| Campo | Valor |
|-------|-------|
| E-mail | `admin@trancify.com` |
| Senha | `admin123` |
| Login | `/login` |
| Painel | `/admin` |
| Tenants | `/admin/tenants` |
| Conta | `/admin/conta` |

---

## Tenant principal — Salão da Naíra

Assinatura **ativa** (sem bloqueio de trial). Ideal para testar o dashboard completo.

| Campo | Valor |
|-------|-------|
| E-mail | `demo@salaodanaira.com.br` |
| Senha | `tenant123` |
| Slug | `naira` |
| Login | `/login` → `/dashboard` |

### Páginas do tenant

| Área | URL |
|------|-----|
| Dashboard | `/dashboard` |
| Serviços | `/dashboard/servicos` |
| Agendamentos | `/dashboard/agendamentos` |
| Agenda | `/dashboard/agenda` |
| Disponibilidade | `/dashboard/disponibilidade` |
| Clientes | `/dashboard/clientes` |
| Pagamentos | `/dashboard/pagamentos` |
| Avaliações | `/dashboard/avaliacoes` |
| Relatórios | `/dashboard/relatorios` |
| Assinatura | `/dashboard/assinatura` |
| Configurações | `/dashboard/configuracoes` |
| Primeiros passos | `/dashboard/primeiros-passos` |

### Páginas públicas

| Área | URL |
|------|-----|
| Agendamento | `/naira` |
| Meu agendamento (CPF) | `/pagar/naira` |
| Avaliação pública | `/avaliar/{reviewToken}` |

O calendário público usa a lista `availableDates` (não só o padrão semanal).
O seed preenche os próximos ~60 dias úteis (Seg–Sáb) para os dois tenants.

---

## Tenant secundário — Studio Bela Trança

Assinatura em **trial**. Útil para testar o painel admin com múltiplos salões.

| Campo | Valor |
|-------|-------|
| E-mail | `demo@belatransa.com.br` |
| Senha | `tenant123` |
| Slug | `bela` |
| Agendamento público | `/bela` |

---

## Clientes demo (CPF)

Usados em `/pagar/naira`, histórico de clientes e relatórios.

### Ana Souza (principal)

| Campo | Valor |
|-------|-------|
| CPF | `12345678909` |
| Nome | Ana Souza |
| WhatsApp | `5511987654321` |

**Agendamentos seed:**
- Hoje — confirmado, pago integral (aparece na agenda)
- +3 dias — pré-agendamento com sinal pendente (aparece em `/pagar/naira`)
- +10 dias — confirmado com sinal pago
- -21 dias — concluído com custo de material (relatórios/lucro)

### Maria Lima

| Campo | Valor |
|-------|-------|
| CPF | `98765432100` |
| Nome | Maria Lima |
| WhatsApp | `5511976543210` |

**Agendamentos seed:**
- -7 dias — concluído e pago (histórico de clientes)
- -3 dias — cancelado

---

## Avaliações

| Tipo | Detalhe |
|------|---------|
| Pública aprovada | Aparece na página `/naira` (5 estrelas) |
| Pendente de moderação | Aparece em `/dashboard/avaliacoes` (aguardando aprovação) |
| Link para enviar avaliação | `/avaliar/00000000-0000-4000-8000-000000000001` |
| Avaliação já enviada | Atendimento com token `00000000-0000-4000-8000-000000000002` |

---

## Cadastro pendente

Fluxo de completar cadastro (`/cadastro/completar/:token`).

| Campo | Valor |
|-------|-------|
| Token | `demo-pending-registration-token` |
| URL | `/cadastro/completar/demo-pending-registration-token` |
| E-mail | `pendente@exemplo.com` |
| Senha (ao concluir) | `pendente123` |
| Slug reservado | `studio-pendente` |
| Plano | `monthly` |

---

## O que o seed popula

| Recurso | Tenant `naira` | Tenant `bela` |
|---------|----------------|---------------|
| Usuário + login | Sim | Sim |
| Serviços | 9 serviços | 3 serviços |
| Disponibilidade | Seg–Sáb, 08h–17h + **próximos 60 dias** em `availableDates` | Seg–Sáb, 08h–17h + próximos 60 dias |
| Clientes | Ana + Maria | — |
| Agendamentos | 6 (vários status) | — |
| Pagamentos simulados | Sim | — |
| Avaliações | 2 | — |
| Assinatura paga | Sim | Trial |
| Cadastro pendente | Global | Global |

---

## Reexecutar o seed

```bash
pnpm --filter @workspace/scripts run seed
```

Com Docker:

```bash
docker compose exec api pnpm --filter @workspace/scripts run seed
```

O seed é **idempotente**: não duplica dados já existentes, mas atualiza campos
do tenant demo e completa o que estiver faltando.
