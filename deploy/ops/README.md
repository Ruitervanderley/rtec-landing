# Deploy OPS Stack

Arquivos para publicar o `noc-app` e o `noc-api` na VPS com Docker Compose e Cloudflare Tunnel.

## Topologia publicada

- `painel.rtectecnologia.com.br` -> `painel-web`
- `api.rtectecnologia.com.br` -> `ops-api`

Os subdomínios dos clientes continuam manuais no Cloudflare via Redirect Rules. Este ciclo não cria regras automaticamente.

## Fluxo oficial

1. Merge em `main`.
2. GitHub Actions builda e publica duas imagens no GHCR:
   - `ghcr.io/ruitervanderley/rtec-landing-ops-api:<sha>`
   - `ghcr.io/ruitervanderley/rtec-landing-painel-web:<sha>`
3. O workflow acessa a VPS via SSH.
4. A VPS sincroniza o repositório, atualiza `IMAGE_TAG=<sha>`, faz `docker compose pull`, `docker compose up -d --force-recreate`, espera os health checks e roda smoke checks.
5. Se o smoke check falhar, o workflow volta para o `IMAGE_TAG` anterior e recria a stack.

O helper [deploy.sh](/E:/PROJETOS/rtec-landing/deploy/ops/deploy.sh) continua existindo para operação manual, mas o caminho oficial de produção passa pelo workflow [deploy-ops.yml](/E:/PROJETOS/rtec-landing/.github/workflows/deploy-ops.yml).

## Arquivos principais

| Arquivo | Uso |
|---|---|
| `docker-compose.yml` | sobe `ops-api`, `painel-web` e `cloudflared` |
| `.env.example` | base das variáveis da VPS |
| `deploy.sh` | helper operacional com pull, recreate, health e smoke checks |
| `cloudflared/config.yml` | referência de ingress quando usar config por arquivo |

## Pré-requisitos da VPS

- Docker e Docker Compose instalados
- repositório clonado na VPS
- `.env` preenchido em `deploy/ops`
- túnel da Cloudflare criado
- hostnames `painel.rtectecnologia.com.br` e `api.rtectecnologia.com.br` apontados para o túnel

## Variáveis da VPS

Copie `.env.example` para `.env` e preencha pelo menos:

- `CLOUDFLARE_TUNNEL_TOKEN`
- `IMAGE_TAG`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPS_ADMIN_SERVICE_TOKEN`
- `NOC_ADMIN_PASSWORD`
- `NOC_SESSION_SECRET`
- `OPS_API_URL`
- `NEXT_PUBLIC_NOC_API_URL`
- `PANEL_PUBLIC_URL`
- `TENANT_REDIRECT_ZONE_HOST`

`IMAGE_TAG` define exatamente qual release do GHCR deve ser promovido. Em deploy automático ele passa a ser o `github.sha` publicado naquele workflow.

## Secrets do GitHub Actions

O workflow automático usa estes secrets:

- `OPS_VPS_HOST`
- `OPS_VPS_PORT`
- `OPS_VPS_USER`
- `OPS_VPS_SSH_KEY`
- `OPS_VPS_DEPLOY_PATH` opcional; prefira caminho absoluto
- `OPS_GHCR_USERNAME` opcional
- `OPS_GHCR_TOKEN` opcional
- `OPS_API_HEALTHCHECK_URL` opcional
- `OPS_PANEL_HEALTHCHECK_URL` opcional

Se `OPS_VPS_DEPLOY_PATH` não for informado, o deploy assume `~/rtec-landing/deploy/ops`.

## Health e smoke checks

O Compose agora usa health checks nativos:

- API: `GET /health`
- painel: `GET /api/health`

O `deploy.sh` também executa:

- smoke check local da API administrativa via `GET /v1/admin/health`
- smoke check local do painel
- smoke check externo das URLs pública da API e do painel

O health detalhado do NOC fica protegido em `GET /v1/admin/health`. O `GET /health` público da API é apenas liveness.

## Publicar um novo tenant

O painel agora devolve uma checklist manual do Cloudflare quando o tenant tiver slug elegível.

Fluxo:

1. Criar ou provisionar o tenant no painel.
2. Confirmar `portalSlug`, `redirectSource` e `redirectTarget`.
3. Criar a Redirect Rule manualmente no Cloudflare.
4. Validar:
   - `https://painel.rtectecnologia.com.br/portal/<slug>`
   - `https://<slug>.rtectecnologia.com.br`

Exemplo de redirect:

- origem: `https://arruda.rtectecnologia.com.br/*`
- destino: `https://painel.rtectecnologia.com.br/portal/arruda`

Durante teste, prefira `302`. Depois estabilize com `301`.

## Tunnel x redirect

Use o tunnel apenas para os hosts fixos da plataforma:

- `painel.rtectecnologia.com.br`
- `api.rtectecnologia.com.br`

Use Redirect Rules para os tenants. O modelo atual é redirect, não rewrite. Isso significa:

- o cliente entra pelo subdomínio próprio
- a navegação final acontece no domínio `painel.rtectecnologia.com.br`
- caminhos extras do host do cliente não são preservados com a regra atual

## Cloudflare Access

Proteja as rotas internas do NOC e deixe o portal fora do Access.

- proteger: `/dashboard*`, `/tenants*`, `/devices*`, `/backups*`, `/servicos*`
- nao proteger: `/portal*`

## Operação manual

Para redeploy manual do release configurado em `.env`:

```bash
cd ~/rtec-landing/deploy/ops
bash deploy.sh
```

Para promover uma tag específica:

```bash
cd ~/rtec-landing/deploy/ops
DEPLOY_IMAGE_TAG=<sha-ou-tag> bash deploy.sh
```

## Troubleshooting

Ver estado e logs:

```bash
docker compose ps
docker logs --tail 200 rtec-ops-panel
docker logs --tail 200 rtec-ops-api
docker logs --tail 200 rtec-cloudflared
```

Checar endpoints:

```bash
curl -I https://api.rtectecnologia.com.br/health
curl -I https://painel.rtectecnologia.com.br/api/health
```

Se o deploy automático falhar, o workflow tenta rollback para o `IMAGE_TAG` anterior. Mesmo assim, a execução fica vermelha para sinalizar que a promoção da nova release não foi concluída.
