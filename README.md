# Rtec Tecnologia

Monorepo da operação comercial e do ecossistema NOC da **Rtec Tecnologia**.

## Aplicações deste repositório

| Projeto | Caminho | Função |
|---|---|---|
| Landing institucional | `./` | Site comercial da Rtec, com CTA para WhatsApp e conteúdo em `pt-BR` e `fr` |
| Painel NOC admin + portal das empresas | `./noc-app` | Painel interno para operação e portal público por tenant |
| API operacional | `./noc-api` | Provisionamento, heartbeats, backups, visão operacional e integração com Supabase |
| Deploy da stack OPS | `./deploy/ops` | Docker Compose e instruções para Oracle Cloud Free + Cloudflare Tunnel |

## Arquitetura atual

- `rtectecnologia.com.br` e `www.rtectecnologia.com.br`: landing institucional.
- `painel.rtectecnologia.com.br`: `noc-app`, publicado na Oracle Cloud Free VPS via Cloudflare Tunnel.
- `api.rtectecnologia.com.br`: `noc-api`, publicado na mesma VPS via Cloudflare Tunnel.
- `<tenant>.rtectecnologia.com.br`: atalho criado no Cloudflare com **Redirect Rule** para `https://painel.rtectecnologia.com.br/portal/<slug>`.

O painel e a API ficam expostos por `cloudflared`. Os subdomínios das empresas **não** apontam direto para a VPS: hoje eles apenas redirecionam para a rota do portal dentro do host `painel`.

## Supabase e tenants

O Supabase é a fonte de verdade para:

- tenants em `public.tenants`
- usuários administrativos das empresas no Supabase Auth
- associação entre usuário e tenant

Fluxo operacional atual:

1. Criar a empresa no painel NOC.
2. Confirmar o `subdomain`/slug salvo para o tenant.
3. (Opcional) Criar/editar usuarios do tenant no detalhe do tenant (usuarios ficam no Supabase Auth + `public.profiles`).
4. Criar manualmente a regra no Cloudflare para esse slug.
5. Validar o acesso no portal pelo caminho `painel.rtectecnologia.com.br/portal/<slug>`.

## Cloudflare hoje

O que existe hoje no Cloudflare é um modelo de **redirect**, não de reverse proxy por tenant.

Consequências práticas:

- o navegador termina no domínio `painel.rtectecnologia.com.br`
- cada tenant precisa de uma regra própria
- o slug da regra deve bater com o `subdomain` salvo no tenant
- links profundos do subdomínio do cliente não são preservados automaticamente por esse modelo
- com o formato atual, `https://<slug>.rtectecnologia.com.br/qualquer-rota` cai no portal base do tenant, não na rota profunda

Formato recomendado da regra:

- origem: `https://<slug>.rtectecnologia.com.br/*`
- destino: `https://painel.rtectecnologia.com.br/portal/<slug>`

Se no futuro você quiser que o cliente continue vendo o próprio subdomínio na barra do navegador, isso deixa de ser redirect e passa a exigir outro desenho: rewrite, worker, proxy por hostname ou app multi-host de verdade.

## Landing institucional

Landing Next.js da Rtec, com foco em infraestrutura, cloud e automação com IA.

### Stack

- Next.js 16 + TypeScript
- Tailwind CSS 4
- `next-intl`
- Clerk
- Drizzle ORM

### Idiomas

- `pt-BR` como idioma padrão
- `fr` como idioma adicional

### Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | URL do PostgreSQL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Sim | Chave pública do Clerk |
| `CLERK_SECRET_KEY` | Sim | Chave secreta do Clerk |
| `NEXT_PUBLIC_WHATSAPP_URL` | Não | Link usado nos CTAs da landing |

### Desenvolvimento local da landing

```bash
npm install
npm run dev
```

O app sobe em `http://localhost:5000`.

### Build da landing

```bash
npm run build
npm run start
```

### Deploy da landing na Cloudflare Pages

O projeto principal usa `static export` para Cloudflare Pages.

- build command: `npm run build:pages`
- output directory: `out`

Para outros hosts Node, continue usando `npm run build` e `npm run start`.

## Stack operacional

Para a stack do painel e da API:

- leia [`noc-app/README.md`](./noc-app/README.md)
- leia [`noc-api/README.md`](./noc-api/README.md)
- leia [`deploy/ops/README.md`](./deploy/ops/README.md)

## Scripts principais da landing

| Comando | Descrição |
|---|---|
| `npm run dev` | Sobe a landing em modo desenvolvimento |
| `npm run build` | Build de produção |
| `npm run build:pages` | Static export para Cloudflare Pages |
| `npm run start` | Sobe a landing em produção |
| `npm run lint` | ESLint |
| `npm run check:types` | TypeScript |
| `npm run check:i18n` | Verifica consistência das traduções |
| `npm run check:deps` | Procura dependências e arquivos não usados |

## Licença

MIT. Baseado em [Next.js Boilerplate](https://github.com/ixartz/Next-js-Boilerplate).
