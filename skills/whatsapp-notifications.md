# Skill: Notificações WhatsApp (Z-API)

## Como funciona

Quando um agendamento é criado via `POST /appointments/book`, o sistema tenta enviar uma mensagem WhatsApp para o telefone cadastrado do tenant (salão). A integração usa a [Z-API](https://www.z-api.io/).

Se as variáveis de ambiente não estiverem configuradas, a notificação é **silenciamente ignorada** — o agendamento ainda é salvo normalmente.

---

## Configurar Z-API

Adicione os segredos no painel de Secrets do Replit:

| Variável           | Onde encontrar                        | Obrigatória |
|--------------------|---------------------------------------|-------------|
| `ZAPI_INSTANCE_ID` | Dashboard Z-API → Instâncias          | Sim         |
| `ZAPI_TOKEN`       | Dashboard Z-API → Instâncias → Token  | Sim         |
| `ZAPI_CLIENT_TOKEN`| Dashboard Z-API → Conta               | Não         |

---

## Código de envio

O código de notificação fica em `artifacts/api-server/src/lib/` (arquivo de notifications/whatsapp). Ele é chamado automaticamente ao criar agendamentos.

---

## Formato da mensagem enviada

```
📅 Novo agendamento!
Cliente: [nome do cliente]
Serviço: [nome do serviço]
Data: [data]
Horário: [horário]
Telefone: [telefone do cliente]
```

---

## Testar sem Z-API

Para desenvolvimento local, basta não configurar as variáveis `ZAPI_*`. O sistema funciona normalmente, apenas sem enviar mensagens.

---

## Adicionar novo tipo de notificação

1. Localizar o módulo de notificações em `artifacts/api-server/src/lib/`
2. Criar uma nova função de envio
3. Chamar na rota relevante (ex: ao confirmar agendamento, ao cancelar)
