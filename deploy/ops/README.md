# Deploy OPS Stack

Arquivos para subir o `noc-app` e o `noc-api` na Oracle Cloud Free VPS usando Docker Compose e Cloudflare Tunnel.

## O que este diretório publica

- `painel.rtectecnologia.com.br` -> container `painel-web`
- `api.rtectecnologia.com.br` -> container `ops-api`

Os subdomínios das empresas não passam pelo tunnel como hostnames dedicados. Eles são publicados no Cloudflare com regras de redirect para o portal do tenant.

## Arquivos

| Arquivo | Uso |
|---|---|
| `docker-compose.yml` | sobe `ops-api`, `painel-web` e `cloudflared` |
| `.env.example` | base das variáveis do deploy |
| `deploy.sh` | helper simples para build e `up` |
| `cloudflared/config.yml` | exemplo de ingress para os hostnames públicos |

## Pré-requisitos na VPS

- Oracle Cloud Free VPS ativa
- Docker e Docker Compose instalados
- túnel da Cloudflare criado
- hostnames `painel.rtectecnologia.com.br` e `api.rtectecnologia.com.br` associados ao túnel

## Passo a passo

1. Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

2. Preencha pelo menos:

- `CLOUDFLARE_TUNNEL_TOKEN`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPS_ADMIN_SERVICE_TOKEN`
- `NOC_ADMIN_PASSWORD`
- `NOC_SESSION_SECRET`

3. Suba a stack:

```bash
docker compose up -d --build
```

ou:

```bash
bash deploy.sh
```

## Cloudflare: tunnel x redirect

Hoje a separação correta é esta:

### Tunnel

Use o tunnel apenas para os hosts fixos da plataforma:

- `painel.rtectecnologia.com.br`
- `api.rtectecnologia.com.br`

### Redirect Rules

Use Redirect Rules para cada empresa atendida. Exemplo:

- origem: `https://arruda.rtectecnologia.com.br/*`
- destino: `https://painel.rtectecnologia.com.br/portal/arruda`

- origem: `https://ouvidor.rtectecnologia.com.br/*`
- destino: `https://painel.rtectecnologia.com.br/portal/ouvidor`

Durante testes, prefira `302`. Troque para `301` quando a regra estiver estável.

## Fluxo para publicar um novo tenant

1. Criar a empresa no painel em `/tenants`.
2. Confirmar o `subdomain` salvo no tenant.
3. Criar a Redirect Rule no Cloudflare com esse mesmo slug.
4. Testar:

- `https://painel.rtectecnologia.com.br/portal/<slug>`
- `https://<slug>.rtectecnologia.com.br`

## Observação importante sobre o modelo atual

Como o Cloudflare está usando **redirect**, não **rewrite**, o cliente entra pelo subdomínio próprio, mas termina navegando no domínio `painel.rtectecnologia.com.br`.

Com o formato atual da regra, qualquer caminho extra no subdomínio do cliente é descartado e o acesso vai para a raiz do portal do tenant.

Se a operação evoluir para white-label real por hostname, será necessário outro desenho de roteamento.
