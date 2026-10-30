# Trancify — SPEC (Spec Driven Development)

> Versão 1.0 · 30/10/2026 · Produto: [`PRD.md`](./PRD.md)
> Este documento é a fonte da verdade para implementação. Cada item tem **contexto, requisitos, modelo de dados, API, UI, critérios de aceite e tarefas**.

---

## 0. Como o agente deve trabalhar com este spec

1. **Leia antes de codar:** `README.md`, `ARCHITECTURE.md`, `AGENTS.md` e este arquivo. Ignore as regras específicas do Replit no `AGENTS.md` (skills, workflows, `.replit`): o projeto agora roda fora do Replit. As demais regras valem: isolamento por `tenantId`, não editar código gerado, JWT próprio.
2. **Ordem obrigatória:** Fase 0 → 1 → 2 → 3 → 4. Dentro de uma fase, siga a ordem dos IDs, salvo dependência indicada.
3. **Um item por vez.** Para cada item: (a) releia a seção, (b) escreva ou ajuste testes que reflitam os critérios de aceite, (c) implemente, (d) rode `pnpm run typecheck` e os testes e confira a Definition of Done de segurança ([§0.3](#03-definition-of-done-por-item)), (e) marque o checkbox em [§9 Progresso](#9-progresso) e faça **um commit por item** com mensagem `feat(F4): ...` ou `fix(C1): ...`.
4. **Mudou contrato de API?** Atualize `lib/api-spec/openapi.yaml` e rode `pnpm --filter @workspace/api-spec run codegen`. Nunca edite `lib/api-client-react/` nem `lib/api-zod/` à mão.
5. **Mudou o schema?** Edite `lib/db/src/schema/`, exporte em `index.ts` e rode `pnpm --filter @workspace/db run push`. Toda coluna nova precisa de default ou ser nullable (há dados em produção). Atualize `scripts/src/seed.ts` quando a feature precisar de dados demo.
6. **Integrações externas** (WhatsApp, gateways): consulte a documentação oficial atual do provedor antes de implementar. Os nomes de endpoints e campos citados aqui são indicativos. Toda integração fica atrás de uma interface com driver `log`/`simulated` para desenvolvimento, sem credenciais.
7. **Dúvida de produto não respondida aqui:** escolha a opção mais simples, registre em [§8 Decisões em aberto](#8-decisões-em-aberto) e siga.
8. **Idioma:** UI e mensagens em português do Brasil. Código e nomes de variáveis em inglês, como já está no projeto.

### 0.1 Convenções globais

- **Fuso:** use `tenant.timezone` (novo campo, default `America/Sao_Paulo`). Datas de agendamento seguem como `date: "YYYY-MM-DD"` + `time: "HH:mm"` em horário local do tenant. Para converter para instante absoluto, use **uma única função** `toInstant(date, time, tz)` em `artifacts/api-server/src/lib/time.ts` (implementar com `date-fns-tz` ou `luxon`).
- **Dinheiro:** valores novos em **centavos (integer)**. As colunas `real` existentes ficam como estão; não migre em massa agora.
- **Telefone:** normalize para E.164 (`+55DDDNUMERO`) com um helper `normalizePhoneBR()` em `lib/phone.ts`. Valide na entrada.
- **Testes:** se o repositório ainda não tiver framework de testes, adicione **Vitest** no `api-server` (Fase 0, item C0). Cubra a lógica de `lib/`. Teste de UI não é obrigatório.
- **Feature flags:** cada feature de Fase 2+ deve poder ser desligada por tenant, via coluna `tenants.features` (json).

### 0.2 Requisitos de segurança (valem para TODOS os itens)

O sistema lida com pagamentos, CPF e telefone (dados pessoais, LGPD). Estes requisitos são **critério de aceite implícito** de cada item. Um item só é marcado como feito se a "Definition of Done de segurança" (§0.3) passar.

**Isolamento e autorização**
- Toda query de dados de tenant filtra por `tenantId` **derivado do JWT**, nunca de body/query/params. Todo `:id` recebido é buscado com `WHERE id = ? AND tenant_id = ?` (evita IDOR). Para cada rota nova, escreva um teste que tenta acessar o recurso de **outro** tenant e espera 404.
- Papéis (`super_admin`, `tenant`, `staff`) checados no servidor por middleware. O frontend esconder um botão não é controle de acesso.
- Rotas públicas por token (`/agendamento/:token`, `/cuidados/:token`, links de lista de espera) usam tokens aleatórios de ≥128 bits (`crypto.randomBytes`), nunca IDs sequenciais, e expõem só o mínimo (sem CPF completo, sem dados de outras clientes).

**Pagamentos e webhooks**
- Nunca confiar no cliente para valor ou status. Preço e sinal são calculados no servidor; status só muda por webhook verificado ou aprovação explícita da trancista.
- Webhook: validar assinatura sobre o **corpo bruto** (raw body) com comparação em tempo constante (`crypto.timingSafeEqual`), rejeitar timestamp fora de janela (anti-replay), conferir que `amount` e `reference` batem com o pedido, e ser idempotente (chave única por evento). Falha de assinatura = 401 sem efeito colateral.
- Não armazenar dados de cartão: usar apenas checkout hospedado do provedor (escopo PCI fica com ele).
- Rotas de simulação/dev (`/billing/simulate/*`, driver `simulated`) **falham fechadas**: só existem quando `NODE_ENV !== "production"` **e** a flag está ligada; teste garante 404 em produção.
- Ações sensíveis (ativar assinatura, aprovar/rejeitar comprovante, exclusão de cliente, mudança de chave Pix) gravam em `audit_log` (`id, tenantId, actorUserId, action, entityId, ip, createdAt`). Mudar a chave Pix notifica a dona por e-mail/WhatsApp.

**Segredos e dados pessoais**
- Segredos só em variáveis de ambiente; nunca no repositório, no frontend (`VITE_*`) ou em logs. `.env` fora do git; `.env.example` só com placeholders.
- Tokens de terceiros guardados por tenant (`mercadopagoAccessToken`, chaves de provedor de WhatsApp) são criptografados em repouso (AES-256-GCM, chave em `DATA_ENCRYPTION_KEY`, com `keyVersion` para rotação).
- Logger (pino) com `redact` para `authorization`, `cookie`, `password`, `cpf`, `token`, `pixKey`, `*.accessToken`. Nunca logar corpo de webhook ou resposta com PII em nível `info`.
- Minimização (LGPD): CPF e telefone são mascarados em respostas e telas onde o valor completo não é necessário (`***.456.789-**`). Busca por CPF devolve resposta uniforme (não revela se existe cliente em outro tenant) e tem rate limit (T2).
- Exclusão/anonimização de cliente a pedido (T1) cobre `clients`, `appointments` (campos pessoais), `message_log.to` e arquivos enviados.

**Entrada, uploads e transporte**
- Toda entrada validada com Zod (body, query, params) antes de tocar o banco; schemas estritos (`.strict()`), limites de tamanho e de array. Só queries parametrizadas do Drizzle; sem SQL concatenado.
- Upload (comprovante, fotos): limite de tamanho, allowlist de tipos conferida por **magic bytes** (não pela extensão), nome aleatório, remoção de EXIF (inclui GPS) e reencode das imagens. **Comprovantes são privados** (URL assinada de curta duração); só fotos públicas de portfólio ficam em bucket público.
- JWT: `JWT_SECRET` forte (≥32 bytes) validado no boot, expiração curta, algoritmo fixo (`HS256`) na verificação, e rate limit + atraso progressivo no login. Hash de senha com bcrypt (cost ≥ 12). Recuperação de senha com token de uso único e expiração.
- Cabeçalhos: `helmet` + CSP restritiva, CORS com allowlist explícita (nunca `*` com credenciais), HTTPS obrigatório (HSTS) e cookies/headers sem dados sensíveis. O token em `localStorage` é um risco de XSS conhecido: manter CSP estrita, nunca usar `dangerouslySetInnerHTML` com dado do usuário, e registrar em §8 a decisão de migrar para cookie `HttpOnly`.
- Chamadas de saída (webhooks, provedores) apenas para hosts de uma allowlist (anti-SSRF). Timeouts e limite de tamanho de resposta.
- Rate limit em rotas públicas e de autenticação; Turnstile no agendamento (T2).

**Cadeia de suprimentos e operação**
- `pnpm audit --prod` no CI (falha em severidade alta/crítica), lockfile versionado, Dependabot/Renovate ativo. Containers rodam como usuário não-root; Postgres sem porta exposta ao público; backups criptografados e restore testado.
- Mensagens de erro ao cliente são genéricas (`{ error, message }`); stack trace só no log. Contas de seed/demo (`SEED_CREDENTIALS.md`) **não existem em produção**: o seed recusa rodar com `NODE_ENV=production`.

### 0.3 Definition of Done (por item)

Antes de marcar o checkbox em §9:
1. Critérios de aceite do item cobertos por teste; `pnpm run typecheck` e `pnpm --filter @workspace/api-server test` verdes.
2. **Segurança:** (a) toda rota nova tem teste de acesso cross-tenant e sem autenticação; (b) entradas validadas com Zod; (c) nenhum segredo/PII em log ou resposta; (d) ações sensíveis no `audit_log`; (e) `pnpm audit --prod` sem alta/crítica.
3. Contrato de API atualizado no `openapi.yaml` + codegen; schema com default/nullable; `scripts/src/seed.ts` atualizado se preciso.
4. Um commit por item (`feat(F4): ...` / `fix(C1): ...`).

---

## Fase 0 — Correções urgentes (bloqueiam vender)

### C0 · Fundação: testes, helpers de tempo e telefone

**Requisitos**
- Adicionar Vitest em `artifacts/api-server` com script `pnpm --filter @workspace/api-server test`.
- Criar `lib/time.ts` (`toInstant`, `nowInTz`, `addDaysLocal`) e `lib/phone.ts` (`normalizePhoneBR`, `isValidPhoneBR`).
- Adicionar `tenants.timezone text not null default 'America/Sao_Paulo'`.

**Aceite**
- `toInstant("2026-11-02","09:00","America/Sao_Paulo")` retorna `2026-11-02T12:00:00.000Z`, independente do `TZ` do processo. Rode os testes com `TZ=UTC` e `TZ=Asia/Tokyo`.
- `normalizePhoneBR("(11) 98888-7777")` retorna `+5511988887777`, e entradas inválidas retornam `null`.

---

### C1 · Assinatura ativada sem pagamento (CRÍTICO)

**Contexto:** `POST /tenants/subscription/activate` (`routes/tenants.ts`) seta `subscriptionStatus: "active"` e `subscriptionEndsAt` na hora e cria um `subscription_orders` com status `pending`, sem cobrar nada. Qualquer tenant ganha acesso grátis.

**Requisitos**
1. Criar a interface `BillingProvider` em `lib/billing/`:
   ```ts
   interface BillingProvider {
     createCheckout(input: { tenantId: string; plan: "monthly" | "annual"; amountCents: number; customer: { name: string; email: string; cpfCnpj?: string } }): Promise<{ reference: string; checkoutUrl: string }>;
     verifyWebhook(req: Request): Promise<{ reference: string; status: "paid" | "failed" | "refunded" } | null>;
   }
   ```
   Drivers: `simulated` (dev) e um real. A sugestão é **AbacatePay**, porque o schema já usa `paymentProvider` com default `abacatepay`. Alternativa: Asaas. Escolha por `BILLING_PROVIDER` no env.
2. `POST /tenants/subscription/activate` passa a **apenas** criar o pedido `pending` + checkout e devolver `{ checkoutUrl }`. **Não altera** `subscriptionStatus`.
3. Novo `POST /billing/webhook` (público): valida a assinatura do provedor, acha o pedido por `paymentReference`, marca `paid` e só então ativa o tenant com `periodStart/periodEnd`. É idempotente.
4. Renovação: um job diário (no `scheduler.ts`) cria o pedido do próximo período 5 dias antes de `subscriptionEndsAt` e envia o link por e-mail ou WhatsApp para a dona. Se vencer sem pagar, aplica 3 dias de carência e depois muda para `expired` (o `TrialExpiredGate` já bloqueia).
5. Preços em **um só lugar** (`lib/billing/plans.ts`): monthly 5000, annual 48000. Remover os valores hardcoded de `TrialExpiredGate.tsx` e lê-los de `GET /tenants/subscription` (que passa a devolver `plans`).
6. O frontend redireciona para `checkoutUrl` e, na volta, faz polling de `GET /tenants/subscription` até ficar `active`.

**Aceite**
- Chamar `/activate` sem pagar mantém o status `trial`/`expired`.
- Um webhook válido ativa a assinatura. O mesmo webhook repetido não duplica período. Um webhook com assinatura inválida retorna 401 e não altera nada.
- Com `BILLING_PROVIDER=simulated`, existe a rota de dev `POST /billing/simulate/:reference` (desativada quando `NODE_ENV=production`).

---

### C2 · WhatsApp não chega na cliente (CRÍTICO)

**Contexto:** `lib/whatsapp.ts` usa um único `CALLMEBOT_APIKEY` e envia para `data.clientPhone`. O CallMeBot só entrega mensagem para o número que gerou aquela chave, então lembretes (24 h/2 h) e pedidos de avaliação não chegam às clientes.

**Requisitos**
1. Criar a interface `MessagingProvider` em `lib/messaging/`:
   ```ts
   interface MessagingProvider {
     sendTemplate(to: string, template: TemplateId, vars: Record<string, string>): Promise<{ id: string }>;
     sendText(to: string, text: string): Promise<{ id: string }>; // só dentro da janela de 24h / provedores que permitem
   }
   ```
   Drivers:
   - `meta_cloud`: WhatsApp Cloud API oficial (templates aprovados). **Padrão de produção.**
   - `evolution`: Evolution API ou Z-API (não oficial, por tenant, opcional, com aviso de risco de banimento na UI).
   - `log`: só registra no log (dev/testes).
   - Remover o CallMeBot como canal para clientes. Pode continuar só como alerta interno para o super admin, ou ser removido de vez.
2. Criar a tabela `message_log` (`id, tenantId, appointmentId?, clientId?, to, template, status: queued|sent|failed|skipped_quota|skipped_optout, providerMessageId, error, createdAt`). Todo envio passa por `lib/messaging/send.ts`, que checa **opt-out**, **franquia (C6)** e grava o log.
3. Templates centralizados em `lib/messaging/templates.ts`, com ID estável, texto pt-BR e variáveis: `booking_confirmed`, `reminder_24h`, `reminder_2h`, `review_request`, `deposit_pending`, `maintenance_reminder` (F4), `aftercare` (F6), `waitlist_slot` (F8), `reschedule_link` (F2).
4. Adicionar `clients.whatsappOptOut boolean default false` e um link "não quero receber mensagens" no rodapé das mensagens/página do agendamento.
5. Fallback manual: quando o envio automático é pulado (sem provedor, sem franquia), o dashboard mostra o botão **"Enviar pelo WhatsApp"** com um link `https://wa.me/<numero>?text=<mensagem codificada>`.
6. Os envios do scheduler viram uma fila simples: a tabela `message_log` com `queued` é processada pelo tick, com até 3 tentativas e backoff.

**Aceite**
- Com `MESSAGING_PROVIDER=log`, um agendamento gera `booking_confirmed` para a cliente e `new_booking` para a trancista no `message_log`.
- Cliente com opt-out recebe `skipped_optout`.
- Falha do provedor gera 3 tentativas e depois `failed` com o erro salvo.
- Nenhum envio usa `process.env.CALLMEBOT_PHONE` como destino de cliente.

---

### C3 · Aviso de novo agendamento vai para o número errado

**Contexto:** `sendBookingNotification` chama `sendCallMeBot(msg)` sem destino, ou seja, envia para `CALLMEBOT_PHONE`, o número da plataforma. Num SaaS multi-tenant, todo salão notifica o mesmo número.

**Requisitos:** o aviso `new_booking` vai para `tenant.whatsapp` (normalizado) pelo `MessagingProvider`. Também aparece em tempo real no dashboard (o projeto já tem `lib/ws.ts`) e, opcionalmente, como notificação push do PWA.

**Aceite:** dois tenants diferentes recebem cada um apenas os próprios avisos. Teste com o driver `log`.

---

### C4 · Lembretes no fuso errado + scheduler ineficiente

**Contexto:** `scheduler.ts` faz `new Date(\`${date}T${time}:00\`)` (fuso do servidor) e carrega **todos** os agendamentos `pending/confirmed` a cada tick.

**Requisitos**
- Usar `toInstant(date, time, tenant.timezone)`.
- Filtrar no SQL apenas agendamentos de hoje até depois de amanhã, com flags de envio nulas.
- Lock simples para não rodar dois ticks ao mesmo tempo (`pg_try_advisory_lock`).

**Aceite:** com `TZ=UTC`, um agendamento às 09:00 em São Paulo recebe o lembrete de 24 h entre 08:00 e 09:05 (horário de SP) do dia anterior. Escrever teste com relógio fixo (`vi.setSystemTime`).

---

### C5 · Deploy de produção fora do Replit

**Requisitos**
- `docker-compose.prod.yml`: `db` (Postgres 16 com volume), `api`, `web` (build estático servido pelo Nginx) e `caddy` (HTTPS automático via Let's Encrypt) para `trancify.com.br` e `*.trancify.com.br` (opcional).
- Backup: um container ou cron com `pg_dump` diário comprimido e retenção de 7 dias, mais o script `scripts/restore.sh`.
- `.env.example` completo com todas as variáveis novas (`BILLING_*`, `MESSAGING_*`, `PUBLIC_BASE_URL`, `TZ=UTC`).
- Remover a dependência de Replit/GCS: object storage com driver `local` (volume) ou **S3-compatível** (Cloudflare R2 / Backblaze), configurável por env.
- Exigir `JWT_SECRET` forte em produção: a API não sobe se faltar ou se for o valor de desenvolvimento.
- Healthcheck `/api/healthz` checando o banco. Logs JSON (pino já existe).
- Documentar em `DEPLOY.md`: VPS mínima, DNS, primeiro deploy, atualização, restore.

**Aceite:** `docker compose -f docker-compose.prod.yml up -d` numa VPS limpa entrega HTTPS funcionando, e o backup aparece no volume após o cron.

---

### C6 · Franquia de mensagens por plano

**Requisitos**
- `lib/billing/plans.ts` define `messageQuota` (trial 50, essencial 300, studio 1000).
- `send.ts` conta o `message_log` com status `sent` no mês corrente (no fuso do tenant). Acima da cota, grava `skipped_quota` e mostra o fallback `wa.me` (C2.5).
- Mensagens para a própria trancista (`new_booking`) **não contam** na cota.
- O dashboard mostra o uso ("212 de 300 mensagens este mês") e avisa a dona ao atingir 80%.

**Aceite:** a 301ª mensagem do mês é pulada com `skipped_quota`, e a contagem reinicia no dia 1º.

---

## Fase 1 — Diferenciais de venda

### F1 · Meios de pagamento: Pix manual + abstração

**Contexto:** hoje o sinal só é real via InfinitePay (`infinitepayHandle`); caso contrário, o modo é simulado.

**Modelo de dados**
- `tenant_payment_settings` (1:1 com o tenant): `provider: none|pix_manual|infinitepay|mercadopago`, `pixKey`, `pixKeyType: cpf|cnpj|email|phone|random`, `pixHolderName`, `depositType: percent|fixed|none`, `depositValue` (percentual 0–100 ou centavos), `depositDeadlineHours` (default 24), `infinitepayHandle` (migrar o campo atual), `mercadopagoAccessToken` (criptografado, fase 2).
- `appointments.paymentProof` (url do comprovante), `appointments.paymentProofStatus: none|submitted|approved|rejected`.

**Requisitos**
1. Interface `PaymentProvider` em `lib/payments/` com os drivers `infinitepay` (mover a lógica atual de `lib/infinitepay.ts`), `pix_manual` e `simulated`.
2. **Pix manual:** a página `/pagar/:slug` mostra o QR Code e o "copia e cola" gerados **localmente** (BR Code estático EMV com chave, nome, cidade e valor; existe biblioteca, ou implemente o CRC16). A cliente faz upload do comprovante. A trancista aprova ou rejeita no dashboard; ao aprovar, o agendamento vira `confirmed` + `paymentStatus` = `deposit_paid` ou `paid`.
3. Se o sinal não for pago até `depositDeadline`, o agendamento vira `expired` e o horário é liberado. Isso dispara F8 (lista de espera) quando existir.
4. A tela de Configurações → Pagamentos ganha um assistente: escolher o provedor, testar com um pagamento de R$1 (InfinitePay) ou ver a prévia do QR (Pix manual).

**Aceite**
- O QR gerado é lido corretamente por um app de banco (validar o payload contra o padrão BR Code, testar o CRC).
- Um comprovante aprovado confirma o agendamento e envia `booking_confirmed`.
- Prazo vencido gera `expired`, e o slot volta a aparecer como disponível.

---

### F2 · Política de cancelamento e remarcação pela cliente

**Modelo:** em `tenant_policies`: `cancelUntilHours` (default 48), `rescheduleUntilHours` (default 48), `maxReschedules` (default 1), `depositRefundable: boolean` (default false), `policyText` (texto livre exibido no agendamento). Em `appointments`: `rescheduleCount int default 0`, `cancelledBy: client|tenant|system`, `cancelReason`.

**Requisitos**
1. Página pública `/agendamento/:token` (usa o `appointments.token` existente): ver detalhes, **remarcar** (escolher novo slot respeitando disponibilidade e limites), **cancelar**, baixar `.ics` e abrir rota no Maps.
2. Fora da janela permitida, os botões ficam desabilitados e aparece "fale com a trancista" (link `wa.me`).
3. No passo de confirmação do agendamento, a cliente precisa marcar o aceite da política (checkbox obrigatório). O aceite é gravado com timestamp (`policyAcceptedAt`).
4. Toda mudança notifica a trancista (`new_booking`/`rescheduled`/`cancelled`) e a cliente (`reschedule_link`).
5. A trancista pode marcar **"não compareceu"** (`status: no_show`, novo valor no enum). Isso entra nos relatórios e no histórico da cliente.

**Aceite:** a cliente remarca dentro da janela, o slot antigo é liberado e o novo é ocupado de forma atômica (transação + checagem de conflito). Uma segunda remarcação acima de `maxReschedules` é recusada.

---

### F3 · Landing page + onboarding guiado

**Requisitos**
1. `/` (home pública) vira a landing de venda: herói com o pitch ("Chega de bolo…"), 3 benefícios (sinal no Pix, orçamento automático, lembrete de manutenção), print da página da cliente, preço (lido de `plans.ts`), FAQ, depoimentos (array estático editável) e CTA "Testar grátis".
2. Cadastro mais curto: nome, e-mail, senha, nome do studio, WhatsApp. Endereço e CPF/CNPJ ficam para depois (Configurações).
3. A rota `/dashboard/primeiros-passos` (já existe) vira um **checklist com progresso**: (a) escolher modelos de serviço, (b) definir horários, (c) configurar sinal, (d) personalizar cores/logo, (e) **copiar link da bio**, (f) fazer um agendamento de teste. O progresso é salvo em `tenants.onboarding` (json).
4. **Modelos de serviço prontos** ao criar a conta: box braids, nagô, fulani, twist, gypsy, knotless, trança masculina e manutenção, com durações e preços sugeridos (editáveis), seed em `lib/serviceTemplates.ts`.
5. Botão "Compartilhar": copiar o link, gerar um card para Story (imagem PNG com logo, cores e QR do link, gerada no cliente com canvas) e um texto pronto para a bio.
6. Meta tags/OG da página pública `/:slug` com nome, logo e cor da trancista (SSR leve ou rota da API que injeta as meta tags).

**Aceite:** uma conta nova chega ao link de bio funcional em ≤ 5 passos, sem tela de erro. O Lighthouse mobile da landing fica ≥ 85 em performance.

---

### F4 · Lembrete de manutenção e retirada (diferencial nº 1)

**Modelo**
- `services.maintenanceAfterDays int null` (ex.: box braids 42, nagô 21) e `services.removalAfterDays int null` (ex.: 60).
- `appointments.maintenanceReminderSent timestamp null` e `appointments.removalReminderSent timestamp null`.

**Requisitos**
1. Após um agendamento `completed`, o scheduler agenda `maintenance_reminder` em `date + maintenanceAfterDays`, às 10:00 do fuso do tenant. A mensagem inclui o link de agendamento já filtrado pelo serviço de manutenção ou pelo mesmo serviço.
2. Se a cliente já tiver novo agendamento futuro no tenant, **não envia**.
3. Envio único por agendamento. Respeita opt-out e cota.
4. O relatório ganha um card: "Clientes que voltaram pelo lembrete" (agendamento criado ≤ 7 dias depois do lembrete, atribuído via parâmetro `?ref=maint_<appointmentId>` no link).
5. O dashboard ganha a lista "Clientes para chamar esta semana" (manutenção vencendo), com botão `wa.me` manual.

**Aceite:** um serviço com `maintenanceAfterDays=42` concluído em 01/11 gera o envio em 13/12 às 10:00 de SP. Se a cliente agendar antes, o envio é cancelado. A atribuição funciona no relatório.

---

### F5 · Orçamento automático

**Contexto:** hoje há só `priceSmall/priceLarge` + `braidSize` (`mid_back|waist_butt`).

**Modelo** (mantendo compatibilidade):
- `service_options`: `id, serviceId, tenantId, group (ex.: "Comprimento", "Espessura", "Extras"), label, priceDeltaCents int, durationDeltaMinutes int, sortOrder, selectionType: single|multi, required boolean`.
- `appointments.selectedOptions json` (snapshot: `[{group,label,priceDeltaCents,durationDeltaMinutes}]`), `appointments.quotedPriceCents int`, `appointments.quotedDurationMinutes int`.
- Migração: os serviços com `sizeDependent=true` geram automaticamente o grupo "Comprimento" com 2 opções (Até meio das costas → `priceSmall`; Cintura/bumbum → diferença para `priceLarge`). `braidSize` continua sendo gravado para não quebrar relatórios, mas passa a ser derivado.

**Requisitos**
1. Na página pública, depois de escolher o modelo, a cliente responde os grupos (chips grandes e mobile first). O **preço e a duração atualizam em tempo real**.
2. O preço final é calculado **no servidor** (`lib/quote.ts`, função pura e testada). O valor vindo do cliente é ignorado.
3. Campo opcional "Foto do seu cabelo hoje" (usa o upload existente → `referencePhotos`) e "Você vai trazer o material?" (Sim/Não → afeta o preço se o tenant configurar `materialIncludedPriceCents`).
4. A duração calculada ocupa a agenda corretamente: sessões longas bloqueiam os slots necessários e respeitam `breakAfterMinutes` e `maxAppointmentsPerDay`.
5. Modo **"faixa de preço"**: se o tenant marcar `priceIsEstimate`, exibir "a partir de R$X" e o texto "valor final confirmado pela trancista".

**Aceite:** cobrir `lib/quote.ts` com testes (combinações single/multi, obrigatórios, deltas negativos proibidos abaixo de 0). Um serviço legado `sizeDependent` mantém exatamente os mesmos preços após a migração.

---

## Fase 2 — Retenção e profissionalismo

### F6 · Cuidados pós-trança automáticos

- `services.aftercareText text null`, com textos sugeridos por modelo de serviço (F3.4).
- Template `aftercare` enviado 2 h após `completed`, antes do pedido de avaliação (que passa para 24 h depois).
- Página pública `/cuidados/:token` com o texto formatado e a marca do studio (a mensagem leva o link, o que economiza caracteres).
- **Aceite:** ordem de envio aftercare (+2 h) → review (+24 h). Texto vazio = não envia.

### F7 · Vitrine de modelos + antes/depois

- `portfolio_items`: `id, tenantId, serviceId?, title, beforePhotoUrl?, afterPhotoUrl, tags[], featured boolean, sortOrder, reviewId?`.
- A página pública ganha uma galeria (grid 2 colunas no mobile, lazy-load, imagens redimensionadas no upload para 1080px WebP). Tocar num item abre "Quero esse!" → inicia o agendamento com o serviço pré-selecionado.
- Ao concluir um atendimento, a trancista pode subir a foto do "depois" em 1 toque. Ela vira um item de portfólio (rascunho) e é vinculada à avaliação da cliente quando houver.
- Consentimento: checkbox para a cliente autorizar o uso da foto (`appointments.photoConsent`).
- **Aceite:** item sem consentimento não aparece publicamente. Imagens públicas têm < 200 KB.

### F8 · Lista de espera

- `waitlist_entries`: `id, tenantId, serviceId, clientName, clientPhone, preferredDates[] (ou "qualquer"), createdAt, notifiedAt, status: waiting|notified|booked|expired`.
- Quando não há horário, a página pública oferece "Entrar na lista de espera".
- Quando um agendamento é cancelado/expira/é remarcado (F1.3, F2), o sistema notifica (`waitlist_slot`) as primeiras 3 da fila compatíveis, com um link que segura o slot por 30 min para quem clicar primeiro.
- **Aceite:** um cancelamento dispara a notificação. Duas clientes clicando juntas: só uma consegue (lock transacional).

### F9 · Material, estoque e lucro real

- `materials`: `id, tenantId, name (ex.: "Jumbo Ser Mulher 400g cor 1B"), unit (pacote|g|un), costCents, stockQty, minStockQty`.
- `service_materials`: consumo padrão por serviço/opção (ex.: box braids + comprimento cintura = 6 pacotes).
- Ao concluir um atendimento: um modal pré-preenchido com o consumo padrão (editável) dá baixa no estoque e grava `appointment_materials` (snapshot do custo). Isso substitui o `materialCost` manual, mantendo a coluna como total calculado.
- Relatórios: lucro por serviço, lucro por mês e materiais mais usados. Alerta de estoque baixo no dashboard, com a "Lista de compras da semana" (consumo previsto dos agendamentos dos próximos 7 dias − estoque).
- **Aceite:** baixa de estoque correta, e o lucro do relatório = preço − custo dos materiais do snapshot (não muda se o custo do material for editado depois).

---

## Fase 3 — Plano Studio

### F10 · Múltiplas trancistas + atendimento em dupla

- `staff`: `id, tenantId, name, phone, color, active, userId?` (login próprio opcional com papel `staff`: vê só a própria agenda).
- `staff_availability` (mesma estrutura de `availability`, por pessoa). A `availability` atual vira a do dono (migração).
- `appointment_staff`: N:N (`appointmentId, staffId, role: lead|assistant, sharePercent`).
- `services.staffRequired int default 1` e `services.durationWithTwoMinutes int null` (duração quando feito em dupla).
- O cálculo de slots passa a considerar a interseção da disponibilidade das pessoas necessárias. A cliente pode escolher a trancista ou "qualquer uma".
- Relatório de comissão/divisão por pessoa.
- Gating: só no plano `studio` (C1 `plans.ts` ganha `maxStaff`).
- **Aceite:** um serviço com `staffRequired=2` só oferece horários em que duas pessoas estão livres, e a divisão de valor no relatório soma 100%.

### F11 · Cursos e turmas

- `courses` (`title, description, priceCents, depositCents, maxSeats, dates[], location, online boolean`) e `course_enrollments` (com pagamento via F1).
- Página pública `/:slug/cursos`, com controle de vagas, lista de presença e certificado simples em PDF (nome + curso + data + assinatura da trancista).
- **Aceite:** sem overbooking de vagas, e o sinal é cobrado pelo mesmo `PaymentProvider`.

---

## Fase 4 — Efeito de rede

### F12 · Diretório público de trancistas

- Opt-in por tenant (`tenants.listedInDirectory`, `serviceArea` com cidade/bairro e "atende a domicílio").
- Páginas SEO estáticas ou com ISR: `/trancistas/sp/guarulhos`, `/trancistas/sp/guarulhos/box-braids`, com cards (foto destaque do portfólio, nota média, preço "a partir de", link para `/:slug`).
- Ordenação: nota × nº de avaliações × atividade recente. Sem pagamento para ranquear nesta fase.
- `sitemap.xml` e dados estruturados `LocalBusiness`/`HairSalon`.
- **Aceite:** a página indexável renderiza sem JS. Um tenant sem opt-in nunca aparece.

---

## 7. Itens transversais (fazer junto com a fase indicada)

| ID | Item | Fase |
|---|---|---|
| T1 | Política de privacidade + termos (páginas estáticas) e exclusão de dados da cliente a pedido (anonimizar CPF/telefone) | 0 |
| T2 | Rate limit nas rotas públicas de lookup por CPF (`/clients/*`) e captcha leve (Turnstile) no agendamento | 0 |
| T3 | Super admin: ver `message_log`, pedidos de assinatura, MRR, trials ativos, churn do mês | 1 |
| T4 | Relatório "o Trancify te trouxe": nº de sinais pagos, clientes que voltaram pelo lembrete, mensagens enviadas | 1 |
| T5 | Programa de indicação: `tenants.referralCode`; o indicado que paga dá 1 mês grátis (crédito no próximo pedido) para quem indicou | 2 |
| T6 | Analytics de produto (Plausible/Umami self-hosted) na landing e eventos-chave do funil | 1 |

## 8. Decisões em aberto

> O agente registra aqui as decisões que tomar, no formato: `AAAA-MM-DD · item · decisão · motivo`.

- Provedor de cobrança da assinatura: AbacatePay ou Asaas (C1).
- Provedor de WhatsApp padrão em produção: Meta Cloud API direto ou um BSP (C2).
- Trial de 7 ou 14 dias (PRD §5).
- Token de sessão: manter JWT em `localStorage` ou migrar para cookie `HttpOnly` + proteção CSRF (§0.2).

## 9. Progresso

**Fase 0**
- [ ] C0 Fundação (testes, tempo, telefone, `tenants.timezone`)
- [ ] C1 Cobrança real da assinatura
- [ ] C2 Mensageria (provider + templates + log + opt-out + fallback)
- [ ] C3 Aviso de novo agendamento para a trancista certa
- [ ] C4 Scheduler com fuso correto + eficiente
- [ ] C5 Deploy de produção
- [ ] C6 Franquia de mensagens
- [ ] T1 Privacidade/termos/exclusão
- [ ] T2 Rate limit + captcha

**Fase 1**
- [ ] F1 Pix manual + abstração de pagamentos
- [ ] F2 Cancelamento/remarcação
- [ ] F3 Landing + onboarding
- [ ] F4 Lembrete de manutenção
- [ ] F5 Orçamento automático
- [ ] T3 Super admin
- [ ] T4 Relatório de valor
- [ ] T6 Analytics

**Fase 2**
- [ ] F6 Cuidados pós-trança
- [ ] F7 Vitrine + antes/depois
- [ ] F8 Lista de espera
- [ ] F9 Material e estoque
- [ ] T5 Indicação

**Fase 3**
- [ ] F10 Múltiplas trancistas + dupla
- [ ] F11 Cursos

**Fase 4**
- [ ] F12 Diretório público
