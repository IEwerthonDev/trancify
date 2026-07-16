# Integração InfinitePay — o que você precisa fazer

O Trancify já tem o fluxo de checkout InfinitePay implementado. Pagamentos
online só são gerados quando a cliente escolhe **Pix** ou **Cartão** no
agendamento. **Dinheiro** é sempre presencial (sem link InfinitePay).

Documentação oficial: [infinitepay.io/checkout](https://www.infinitepay.io/checkout)

---

## Visão rápida do fluxo no Trancify

```
Cliente agenda (Pix ou Cartão)
  → Acessa /pagar/:slug com o CPF
  → Clica em pagar sinal / valor inteiro
  → API POST /api/payments/link
       ├─ paymentMethod = cash     → não gera InfinitePay
       ├─ sem InfiniteTag no salão → modo simulado
       └─ Pix/Cartão + InfiniteTag → cria link e redireciona ao checkout
  → Cliente paga no checkout InfinitePay
  → Redirect → GET /api/payments/callback (valida com payment_check)
  → Webhook  → POST /api/payments/webhook (confirma e notifica o dashboard)
```

Código relevante:

| Arquivo | Função |
|---------|--------|
| `artifacts/api-server/src/lib/infinitepay.ts` | Criação de link + `payment_check` |
| `artifacts/api-server/src/routes/payments.ts` | `/link`, `/callback`, `/webhook` |
| `artifacts/trancify/src/pages/public/pagar.tsx` | UI de pagamento por CPF |
| Dashboard → Configurações | Campo `InfiniteTag` do tenant |

---

## Checklist do que você precisa fazer

### 1. Conta InfinitePay

1. Crie/acesse a conta no app InfinitePay.
2. Anote sua **InfiniteTag** (usuário do app), **sem o `$`**.
   - Ex.: se no app aparece `$minhasalao`, use `minhasalao`.
3. Confirme que a conta está apta a receber Pix e cartão no checkout.

### 2. Configurar a tag no salão (tenant)

No painel do tenant:

1. Login → **Configurações**
2. Campo **InfiniteTag (InfinitePay)**
3. Salve (ex.: `minhasalao`)

Sem essa tag, o sistema permanece em **modo simulado** (útil para testes locais).

### 3. URL pública HTTPS (obrigatória em produção)

A InfinitePay precisa chamar sua API e redirecionar o cliente de volta.

Defina:

```bash
PUBLIC_BASE_URL=https://seu-dominio.com
```

Com isso o Trancify monta:

| Uso | URL gerada |
|-----|------------|
| Redirect após pagamento | `{PUBLIC_BASE_URL}/api/payments/callback` |
| Webhook de confirmação | `{PUBLIC_BASE_URL}/api/payments/webhook` |
| Página da cliente | `{PUBLIC_BASE_URL}/pagar/{slug}` |

Requisitos:

- HTTPS em produção (a InfinitePay não chama `http://localhost` de forma confiável)
- A URL deve ser alcançável na internet (domínio real, túnel ngrok/Cloudflare Tunnel em testes)

### 4. Testar o fluxo ponta a ponta

1. Configure a InfiniteTag no tenant.
2. Defina `PUBLIC_BASE_URL` apontando para um host público.
3. Reinicie a API / `docker compose up -d`.
4. Agende em `/naira` escolhendo **Pix** ou **Cartão** (não Dinheiro).
5. Em `/pagar/naira`, busque o CPF e clique em pagar.
6. Você deve ser redirecionado ao checkout InfinitePay.
7. Após pagar (ou cancelar), volta para `/pagar/naira?paid=1` ou `paid=0`.
8. No dashboard do tenant, a aba **Pagamentos** deve refletir o status.

### 5. (Opcional) Webhook e segurança

O Trancify já:

- Gera `order_nsu` único por tentativa
- Valida o pagamento com `payment_check` antes de marcar como pago
- Atualiza o agendamento de forma atômica (evita corrida com expiração)
- Emite evento WebSocket para a aba Pagamentos

Você **não** precisa configurar o webhook manualmente no painel InfinitePay:
ele vai na criação do link (`webhook_url`). Só garanta que
`PUBLIC_BASE_URL/api/payments/webhook` responda 200 em produção.

---

## Regras de negócio (importantes)

| Forma escolhida no booking | InfinitePay? | O que acontece |
|----------------------------|--------------|----------------|
| Pix | Sim (se houver InfiniteTag) | Link de checkout |
| Cartão | Sim (se houver InfiniteTag) | Link de checkout |
| Dinheiro | Não | Mensagem “pague no salão”; sem botões de pagamento online |

Pré-agendamentos com Pix/Cartão ainda usam o prazo de sinal; sem pagamento
no prazo, o scheduler pode expirar o horário.

---

## Variáveis de ambiente

| Variável | Obrigatória? | Uso |
|----------|--------------|-----|
| `PUBLIC_BASE_URL` | Sim em produção | Base para callback, webhook e links |
| `JWT_SECRET` | Sim | Auth do dashboard |
| `DATABASE_URL` | Sim | Persistência de tentativas de pagamento |

Não há API key da InfinitePay no código atual: a autenticação do checkout
público usa o **handle (InfiniteTag)** no body das requests.

---

## Endpoints InfinitePay usados pelo Trancify

```
POST https://api.checkout.infinitepay.io/links
POST https://api.checkout.infinitepay.io/payment_check
```

Payload típico do link (já montado pelo backend):

```json
{
  "handle": "sua_infinitetag",
  "order_nsu": "uuid-do-pedido",
  "redirect_url": "https://seu-dominio.com/api/payments/callback",
  "webhook_url": "https://seu-dominio.com/api/payments/webhook",
  "items": [
    {
      "quantity": 1,
      "price": 10000,
      "description": "Sinal — Box Braids (Salão da Naíra)"
    }
  ],
  "customer": {
    "name": "Ana Souza",
    "phone_number": "5511987654321"
  }
}
```

Preços vão em **centavos**.

---

## Docker / local

No `docker-compose.yml`, `PUBLIC_BASE_URL` padrão é `http://localhost:3000`.
Isso serve para UI e modo simulado, **mas não** para receber webhook real da
InfinitePay.

Para testar InfinitePay de verdade a partir da máquina local:

1. Suba um túnel (ex.: `cloudflared tunnel` ou `ngrok http 3000`)
2. Exporte `PUBLIC_BASE_URL=https://seu-tunel.exemplo`
3. Recrie o serviço API: `docker compose up -d api`
4. Configure a InfiniteTag no tenant

---

## Problemas comuns

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Sempre “modo simulado” | InfiniteTag vazia | Preencher em Configurações |
| Link não abre / 502 | InfinitePay rejeitou o handle/URL | Conferir tag e `PUBLIC_BASE_URL` HTTPS |
| Pagou e voltou `paid=0` | Callback sem validação / URL errada | Conferir redirect e `payment_check` |
| Cliente escolheu Dinheiro e não paga online | Esperado | Orientar pagamento no salão |
| Webhook não chega | Host inacessível / HTTP | Usar HTTPS público |

---

## Resumo do mínimo para “ligar de verdade”

1. Conta InfinitePay + InfiniteTag  
2. Salvar a tag em **Configurações** do salão  
3. `PUBLIC_BASE_URL` HTTPS público  
4. Testar agendamento com **Pix ou Cartão** → `/pagar/:slug` → checkout  

Com isso a integração fica operacional. Dinheiro permanece fora do InfinitePay
por desenho.
