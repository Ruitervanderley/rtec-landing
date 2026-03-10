# NOC API

API operacional da Rtec para provisionamento, heartbeat, backups, tenants e integracao com Supabase.

## Responsabilidades

- provisionar tenants e usuarios administrativos
- emitir e revogar tokens de dispositivos
- receber heartbeats dos notebooks/agentes
- registrar e acompanhar backups
- entregar dados administrativos para o `noc-app`
- expor dados publicos e autenticados do portal por tenant
- manter o modulo NOC legado de servicos, dispositivos e incidentes

## Stack

- Node.js 20+
- TypeScript
- Express
- PostgreSQL
- Drizzle ORM
- Supabase

## Desenvolvimento local

1. Defina `DATABASE_URL`.
2. Instale dependencias:

```bash
cd noc-api
npm install
```

3. Aplique as migrations:

```bash
psql "$DATABASE_URL" -f src/db/migrations/0000_initial.sql
psql "$DATABASE_URL" -f src/db/migrations/0001_operational.sql
psql "$DATABASE_URL" -f src/db/migrations/0002_ops.sql
```

4. Suba a API:

```bash
npm run dev
```

A API sobe em `http://localhost:4000`.

## Variaveis de ambiente

| Variavel | Obrigatoria | Descricao |
|---|---|---|
| `DATABASE_URL` | Sim | PostgreSQL da operacao |
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Sim | Chave publica usada em validacoes |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave administrativa para provisionamento |
| `OPS_ADMIN_SERVICE_TOKEN` | Sim | Token interno aceito pelos endpoints `/v1/admin/*` |
| `PANEL_PUBLIC_BASE_URL` | Nao | Base publica do portal. Default: `https://painel.rtectecnologia.com.br` |
| `R2_ACCOUNT_ID` | Nao | Conta Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Nao | Chave do R2 |
| `R2_SECRET_ACCESS_KEY` | Nao | Segredo do R2 |
| `R2_BUCKET` | Nao | Bucket dos backups |
| `R2_PUBLIC_BASE_URL` | Nao | Base publica para objetos, se usada |
| `TELEGRAM_BOT_TOKEN` | Nao | Bot de alertas |
| `TELEGRAM_CHAT_ID` | Nao | Destino dos alertas |
| `CLOUDFLARE_API_TOKEN` | Nao | Opcional. So use se quiser automacao de DNS na API |
| `CLOUDFLARE_ZONE_ID` | Nao | Opcional. So use com a automacao de DNS |
| `SAAS_TARGET_IP` | Nao | Opcional. IP alvo para criacao automatica de registro DNS |

## Supabase como fonte de verdade

O provisionamento das empresas acontece com base no Supabase:

- o tenant e criado em `public.tenants`
- o usuario administrador da empresa e criado no Supabase Auth
- a API faz upsert explicito em `public.profiles`
- o `subdomain` passa a ser a chave canonica do portal

Endpoint principal:

- `POST /v1/admin/tenants/provision`

Esse endpoint cria a empresa, o usuario administrador e retorna os valores operacionais usados na configuracao manual do Cloudflare:

- `portalUrl`
- `redirectSource`
- `redirectTarget`
- `tenantId`
- `userId`

No fluxo operacional da Rtec, a publicacao do subdominio no Cloudflare continua sendo manual.

## Cloudflare no fluxo atual

O cenario em producao hoje e:

- `api.rtectecnologia.com.br` aponta para esta API via Cloudflare Tunnel
- `painel.rtectecnologia.com.br` aponta para o `noc-app` via Cloudflare Tunnel
- cada subdominio de cliente usa uma **Redirect Rule** para `https://painel.rtectecnologia.com.br/portal/<slug>`

Se `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ZONE_ID` estiverem vazios, a API continua funcionando normalmente no fluxo manual de Cloudflare.

## Endpoints operacionais

### Dispositivos e backups

| Metodo | Rota | Uso |
|---|---|---|
| `POST` | `/v1/device/provision` | emite `deviceToken` para um dispositivo autorizado |
| `POST` | `/v1/device/heartbeat` | recebe heartbeat do dispositivo |
| `POST` | `/v1/backups/request-upload` | gera upload assinado no R2 |
| `POST` | `/v1/backups/complete` | conclui backup com status `UPLOADED` ou `FAILED` |

### Administracao

| Metodo | Rota | Uso |
|---|---|---|
| `GET` | `/v1/admin/overview` | resumo operacional |
| `GET` | `/v1/admin/devices` | lista de dispositivos |
| `GET` | `/v1/admin/backups` | trilha de backups |
| `GET` | `/v1/admin/tenants` | lista de tenants |
| `GET` | `/v1/admin/tenants/:id/detail` | detalhe operacional do tenant (inclui usuarios e infraestrutura) |
| `PATCH` | `/v1/admin/tenants/:id` | ajuste de tenant |
| `POST` | `/v1/admin/tenants/provision` | cria tenant e admin |
| `POST` | `/v1/admin/tenants/:id/users` | cria usuario do tenant (Supabase Auth + `public.profiles`) |
| `PATCH` | `/v1/admin/tenants/:id/users/:userId` | edita `display_name`, `is_admin` e `valid_until` do usuario |
| `POST` | `/v1/admin/tenants/:id/users/:userId/reset-password` | redefine senha do usuario no Supabase Auth |
| `DELETE` | `/v1/admin/tenants/:id/users/:userId` | remove usuario (apaga `public.profiles` e tenta apagar no Auth) |
| `POST` | `/v1/admin/devices/:id/revoke` | revoga dispositivo |

### Portal

#### Publico

| Metodo | Rota | Uso |
|---|---|---|
| `GET` | `/v1/portal/:slug` | resumo publico do tenant (sem autenticacao) |

#### Autenticado (Supabase Auth)

Esses endpoints exigem `Authorization: Bearer <access_token>` do Supabase Auth.

| Metodo | Rota | Uso |
|---|---|---|
| `GET` | `/v1/portal/me` | retorna o perfil do usuario autenticado e o tenant associado |
| `GET` | `/v1/portal/tenants/:slug/overview` | dados do portal + ultimas sessoes |
| `GET` | `/v1/portal/tenants/:slug/sessions` | lista sessoes (filtros: `from`, `to`, `status`, `limit`) |
| `GET` | `/v1/portal/tenants/:slug/speaker-usage` | agregados por vereador (filtros: `from`, `to`) |
| `GET` | `/v1/portal/tenants/:slug/sessions/:sessionGuid/audit-logs` | logs auditaveis de uma sessao |

O middleware valida `public.profiles`, exige que o usuario pertença ao mesmo `tenant_id` do `portal_slug` e bloqueia acesso cruzado entre tenants com `403 TENANT_MISMATCH`.

### Modulo NOC legado

| Metodo | Rota | Uso |
|---|---|---|
| `POST` | `/ingest-event` | recebe evento tecnico |
| `GET` | `/incidents` | lista incidentes |
| `GET` | `/devices/:id/status` | status interpretado do dispositivo |
| `POST` | `/devices` | cria dispositivo |
| `GET` | `/services` | lista servicos |
| `POST` | `/services` | cria servico |
| `GET` | `/services/:id` | detalhe do servico |
| `POST` | `/services/:id/devices` | vincula dispositivo ao servico |
| `DELETE` | `/services/:id/devices/:deviceId` | remove vinculo |
| `GET` | `/health` | health check |

## Jobs embutidos

Quando a API inicia, ela roda jobs de apoio:

- deteccao de dispositivo offline
- retencao de backups antigos
- envio de alertas operacionais

## Estrutura

- `src/db/`: schema e migrations
- `src/routes/`: rotas REST
- `src/ops/`: auth, jobs, Supabase, R2 e alertas
- `src/engine/`: correlacao do modulo NOC legado

O painel que consome esta API esta em [`noc-app/README.md`](../noc-app/README.md).
