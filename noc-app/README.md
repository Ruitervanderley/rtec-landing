# NOC App

Painel web da operacao da Rtec e portal das empresas atendidas.

## O que este app entrega hoje

- login administrativo interno do NOC
- visao operacional em `/dashboard`
- gestao de tenants em `/tenants`
- gestao de usuarios por tenant em `/tenants/[id]` (Supabase Auth + `public.profiles`)
- visao de dispositivos em `/devices`
- trilha de backups em `/backups`
- modulo NOC legado em `/servicos`
- portal publico por tenant em `/portal/[slug]`
- portal autenticado de relatorios em `/portal/[slug]/relatorios`

## Modelo de acesso dos tenants

O portal das empresas usa dois conceitos diferentes:

- **host canonico da aplicacao**: `painel.rtectecnologia.com.br`
- **atalho por empresa**: `<slug>.rtectecnologia.com.br`, criado no Cloudflare com redirect para `/portal/<slug>`

Na operacao atual, o subdominio da empresa e apenas uma porta de entrada. O app que atende a requisicao continua sendo o `noc-app` publicado em `painel.rtectecnologia.com.br`.

## Rotas principais

| Rota | Uso |
|---|---|
| `/login` | acesso administrativo do NOC |
| `/dashboard` | resumo operacional |
| `/tenants` | cadastro e ajuste das empresas |
| `/tenants/[id]` | detalhe do tenant, usuarios e infraestrutura |
| `/devices` | heartbeats e status dos notebooks/agentes |
| `/backups` | historico de backups enviados |
| `/servicos` | modulo NOC legado |
| `/portal/[slug]` | pagina publica da empresa |
| `/portal/login?slug=[slug]` | login do portal do tenant |
| `/portal/[slug]/relatorios` | area autenticada de relatorios da empresa |

## Variaveis de ambiente

| Variavel | Obrigatoria | Descricao |
|---|---|---|
| `OPS_API_URL` | Sim | URL base da API para chamadas servidor-servidor. Em Docker na VPS use `http://ops-api:4000` |
| `NEXT_PUBLIC_NOC_API_URL` | Sim | URL publica da API usada pelo browser. Ex.: `https://api.rtectecnologia.com.br` |
| `OPS_ADMIN_SERVICE_TOKEN` | Sim | Token interno para endpoints `/v1/admin/*` |
| `NOC_ADMIN_PASSWORD` | Sim | Senha do login administrativo do painel |
| `NOC_SESSION_SECRET` | Sim em producao | Segredo usado para assinar cookies do admin e do portal |
| `SUPABASE_URL` | Sim | URL do projeto Supabase usada pelo login do portal |
| `SUPABASE_ANON_KEY` | Sim | Chave publica usada no fluxo de autenticacao do portal |

## Desenvolvimento local

1. Suba a API primeiro em `http://localhost:4000`.
2. Crie o `.env.local` com as variaveis acima.
3. Execute:

```bash
npm install
npm run dev
```

O app sobe em `http://localhost:3001`.

## Fluxo operacional recomendado

1. Criar a empresa pelo painel em `/tenants`.
2. Confirmar que o tenant foi criado no Supabase, recebeu um `portal_slug` e teve o admin provisionado.
3. Validar o portal pelo host canonico:
   `https://painel.rtectecnologia.com.br/portal/<slug>`
4. Validar o login em:
   `https://painel.rtectecnologia.com.br/portal/login?slug=<slug>`
5. Validar a area autenticada usando o mesmo email e senha do admin criado para o tenant.
6. Encerrar uma sessao oficial no WPF e confirmar o relatorio em `/portal/<slug>/relatorios`.

## Sessao e autenticacao do portal

- O portal autenticado usa login por email e senha contra o Supabase Auth.
- O cookie do portal e separado do cookie administrativo do NOC.
- Quando o access token expira, o app tenta renovar a sessao com `refresh_token` antes de consultar os endpoints `/v1/portal/tenants/:slug/*`.
- Se a renovacao falhar, o cookie e limpo e o usuario volta para a tela de login do tenant.

## Gestao de usuarios do tenant

No detalhe do tenant (`/tenants/[id]`) existe a area **Usuarios do tenant**:

- criar usuarios (cria no Supabase Auth e faz upsert em `public.profiles`)
- editar `display_name`, `is_admin` e `valid_until`
- redefinir senha (minimo 8 caracteres)
- excluir usuario (remove o perfil e tenta remover o usuario no Auth)

Essas acoes sao administrativas do NOC e nao ficam disponiveis no portal.

## Deploy

Na Oracle Cloud Free, este app roda em container e fica exposto pelo `cloudflared`.

- hostname publico: `painel.rtectecnologia.com.br`
- porta interna do container: `3001`
- trafego vindo dos subdominios dos tenants chega por redirect do Cloudflare, nao por publicacao direta do container

Os arquivos de deploy estao em [`deploy/ops/README.md`](../deploy/ops/README.md).
