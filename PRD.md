# Trancify — PRD (Product Requirements Document)

> Versão 1.0 · 30/10/2026 · Dono do produto: Ewerthon
> Documento irmão: [`SPEC.md`](./SPEC.md) (especificação técnica, Spec Driven Development)

---

## 1. Visão

O Trancify é o sistema de agendamento e gestão feito **para trancistas**. Ele não é uma agenda genérica de salão adaptada.

A trancista coloca um link na bio do Instagram. A cliente escolhe o modelo, vê o orçamento, paga o sinal no Pix e recebe os lembretes no WhatsApp. Semanas depois, o próprio Trancify chama a cliente de volta para a manutenção.

**Frase de posicionamento:** *"Chega de bolo e de 'quanto fica?' no direct. Sua agenda de tranças no piloto automático."*

## 2. Problema

| Dor da trancista | Como ela resolve hoje | Custo |
|---|---|---|
| Cliente marca e não aparece ("bolo") numa sessão de 4–10 h | Confia na palavra, cobra sinal manualmente | Um dia de trabalho perdido |
| Responder "quanto fica?" dezenas de vezes por semana | Direct e WhatsApp manual | Horas por semana, cliente desiste |
| Esquecer de lembrar a cliente | Mensagem manual na véspera | Faltas e atrasos |
| Não saber o lucro real (jumbo, cabelo, linha) | Caderno, cabeça | Cobra barato sem perceber |
| Cliente some depois da trança | Nada | Receita recorrente perdida |
| Agendas genéricas não entendem trança (tamanho, comprimento, duração longa, dupla de trancistas) | Adapta ou desiste | Ferramenta abandonada |

## 3. Público

- **Primário:** trancista autônoma ou com até 3 pessoas, que atende em casa, em estúdio ou a domicílio e vende pelo Instagram/WhatsApp. Estimativa do setor: 600–800 mil trancistas no Brasil, ocupação reconhecida na CBO em 2025.
- **Secundário:** salões especializados em tranças afro, com 2–5 trancistas.
- **Usuária final (não pagante):** a cliente que agenda.

### Personas

- **Naira, 27, autônoma:** atende 2 clientes por dia em casa e tem 4 mil seguidores. Quer parar de responder orçamento e de levar bolo. Paga até ~R$60/mês se isso trouxer resultado.
- **Studio Raízes, 3 trancistas:** fazem box braids em dupla. Precisam dividir a agenda, saber quem fez o quê e controlar o estoque de jumbo.
- **Cliente Júlia, 19:** quer ver fotos, saber o preço e marcar sem conversar muito. Paga Pix na hora.

## 4. Objetivos e métricas

| Objetivo | Métrica | Meta |
|---|---|---|
| Receita | MRR | R$3.700 (≈74 salões no plano de R$50) em até 6 meses do lançamento |
| Ativação | % de contas que configuram serviços + disponibilidade + link na bio em 48 h | ≥ 60% |
| Conversão do trial | trial → pagante | ≥ 25% |
| Retenção | churn mensal | ≤ 5% |
| Valor entregue | % de agendamentos com sinal pago | ≥ 50% |
| Valor entregue | taxa de no-show reportada | queda percebida, medida por agendamentos `expired`/cancelados |
| Recompra | % de clientes que reagendam após lembrete de manutenção | ≥ 15% |

## 5. Preço e planos

Referência de mercado (set/2026): Trinks R$110 (R$76 no anual) + WhatsApp cobrado à parte; Booksy ~R$99,90; Gendo R$99,86; Simples Agenda R$59,90; Agende-me R$59,90; Tua Agenda R$19,90 + R$0,46 por mensagem.

| Plano | Preço | Inclui |
|---|---|---|
| **Trial** | grátis, 7 dias (avaliar 14) | Tudo do Essencial |
| **Essencial** | R$50/mês ou R$40/mês no anual (R$480) | 1 agenda, agendamentos ilimitados, sinal no Pix, **300 mensagens de WhatsApp/mês**, orçamento automático, lembretes de manutenção, relatórios |
| **Studio** (fase 3) | R$89/mês | Até 5 trancistas, atendimento em dupla, estoque, 1.000 mensagens/mês |

Regra: mensagens acima da franquia param de ser enviadas automaticamente. A trancista é avisada e pode enviar manualmente pelo link `wa.me`. Não há cobrança surpresa.

## 6. Escopo

### 6.1 Já existe (v0)

Multi-tenant com página pública `/:slug`, serviços com preço por tamanho, disponibilidade e bloqueios, agendamento público, clientes por CPF, sinal/pagamento via InfinitePay, avaliações, relatórios, trial com bloqueio e PWA.

### 6.2 Correções urgentes (Fase 0 — bloqueiam vender)

1. **Assinatura ativa sem pagamento.** "Ativar plano" libera 30 ou 365 dias sem cobrar. É preciso cobrança real.
2. **WhatsApp não chega na cliente.** O CallMeBot só entrega mensagem para o número dono da chave. Lembretes e pedidos de avaliação não chegam.
3. **Aviso de novo agendamento vai para o número da plataforma**, não para o WhatsApp da trancista.
4. **Lembretes no fuso errado.** O horário é interpretado no fuso do servidor.
5. **Deploy de produção fora do Replit** (VPS + HTTPS + backups).
6. **Franquia de mensagens por plano**, para controlar o custo do WhatsApp oficial.

### 6.3 Funcionalidades

| ID | Funcionalidade | Fase | Por quê |
|---|---|---|---|
| F1 | Pix manual (chave + comprovante) e abstração de meios de pagamento | 1 | Muitas trancistas não usam InfinitePay |
| F2 | Política de cancelamento + remarcação pela cliente | 1 | Sinal só funciona com regra clara |
| F3 | Landing page + onboarding guiado em 5 min | 1 | Ativação sem suporte |
| F4 | Lembrete de manutenção e retirada | 1 | Recompra automática: diferencial nº 1 |
| F5 | Orçamento automático (tipo × tamanho × espessura × extras) | 1 | Acaba com o "quanto fica?" |
| F6 | Cuidados pós-trança automáticos | 2 | Percepção de profissionalismo, custo baixo |
| F7 | Vitrine de modelos + antes/depois ligados às avaliações | 2 | A cliente escolhe pela foto |
| F8 | Lista de espera para encaixes | 2 | Preenche cancelamentos |
| F9 | Controle de material e estoque + lucro real | 2 | A trancista descobre o lucro de verdade |
| F10 | Múltiplas trancistas + atendimento em dupla | 3 | Plano Studio, nicho que ninguém atende |
| F11 | Agenda de cursos e turmas | 3 | Receita extra para a trancista |
| F12 | Diretório público "trancistas perto de você" | 4 | Efeito de rede: o Trancify traz clientes |

### 6.4 Fora de escopo agora

App nativo (o PWA atende), marketplace com pagamento intermediado pela plataforma, emissão de nota fiscal, chat interno, IA conversacional de atendimento.

## 7. Jornadas principais

**Trancista (onboarding):** cadastro → escolhe modelos prontos de serviço (box braids, nagô, fulani, twist…) → ajusta preços → define dias e horários → configura sinal (Pix manual ou InfinitePay) → copia o link da bio → recebe o primeiro agendamento no WhatsApp.

**Cliente (agendamento):** abre o link → vê a vitrine → escolhe o modelo → responde o orçamento (tamanho, espessura, extras) → vê preço e duração → escolhe data e hora → informa nome, WhatsApp e CPF → paga o sinal → recebe confirmação + lembrete de 24 h e de 2 h → é atendida → recebe os cuidados pós-trança → avalia → após N semanas recebe "hora da manutenção" com link para reagendar.

## 8. Requisitos não funcionais

- **LGPD:** CPF e telefone são dados pessoais. Coletar o mínimo, ter política de privacidade, opção de exclusão de cliente, e a cliente pode pedir para não receber mensagens (opt-out).
- **Mobile first:** 90%+ das usuárias acessam pelo celular. Página pública com LCP < 2,5 s em 4G.
- **Fuso:** tudo em `America/Sao_Paulo` por padrão, configurável por tenant.
- **Disponibilidade:** 99,5%, com backup diário do Postgres e retenção de 7 dias.
- **Isolamento multi-tenant:** toda query filtrada por `tenantId`.
- **Custo de infraestrutura:** ≤ R$200/mês até 100 tenants.

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Custo de WhatsApp oficial por mensagem | Franquia por plano, mensagens só transacionais, fallback `wa.me` |
| Provedor não oficial (Evolution/Z-API) ter o número banido | Usar API oficial em produção; não oficial só como opção do tenant |
| Churn alto em público informal | Lembrete de manutenção (gera receita visível), relatório "quanto o Trancify te trouxe" |
| Trancista achar que "o WhatsApp resolve" | Onboarding em 5 min, prova social, indicação |
| Dependência de um gateway | Abstração de pagamentos (F1) |

## 10. Go-to-market (resumo)

1. Cliente zero: trancista da família, usando diariamente.
2. 10 trancistas da rede usando de graça em troca de depoimento em vídeo.
3. Conteúdo no Instagram/TikTok: "fim do bolo", "orçamento sozinho".
4. Indicação: 1 mês grátis por trancista indicada que pagar.
5. Parcerias com lojas de jumbo/cabelo e cursos de trança.
