# NOC App – Painel do Técnico

App mínimo para o técnico **visualizar serviços** cadastrados na NOC API: lista de serviços e detalhe de cada um (dispositivos vinculados e incidentes abertos).

## Como rodar

1. A NOC API deve estar rodando (ex.: `http://localhost:4000`).
2. Defina a URL da API:

```bash
cp .env.example .env
# Edite .env e defina NEXT_PUBLIC_NOC_API_URL=http://localhost:4000
```

3. Instale e inicie:

```bash
npm install
npm run dev
```

O app sobe em **http://localhost:3001**.

## O que o técnico vê

- **Lista de serviços** (nome e criticidade) – dados de `GET /services`.
- **Detalhe do serviço** (`/servicos/[id]`): dispositivos vinculados e incidentes abertos que afetam dispositivos desse serviço – dados de `GET /services/:id`.

Cadastro de serviços e vínculo dispositivo–serviço são feitos pela API (POST /services, POST /services/:id/devices). Você pode expor um formulário neste app depois ou usar a API diretamente (Postman, curl, outro front).

## Deploy

Pode ser deployado em qualquer host de Next.js (Vercel, VPS, etc.). Configure `NEXT_PUBLIC_NOC_API_URL` para a URL pública da NOC API (ex.: `https://api.rtectecnologia.com.br`).

## Painel operacional (MVP)

O app agora possui modulo administrativo interno com rotas:

- `/dashboard` - indicadores gerais (tenants/dispositivos/backups/jobs)
- `/tenants` - status de licenca e online/offline por tenant
- `/devices` - ultimo heartbeat por notebook
- `/backups` - trilha dos backups automaticos
- `/servicos` - modulo NOC original (servicos/dispositivos/incidentes)

## Variaveis de ambiente

No `.env` de producao, configure:

| Variavel | Descricao |
|---|---|
| `OPS_API_URL` | URL base da API operacional (`https://api.rtectecnologia.com.br`) |
| `OPS_ADMIN_SERVICE_TOKEN` | Token interno para endpoints `/v1/admin/*` |
| `NEXT_PUBLIC_NOC_API_URL` | Mantida para modulo NOC legado |

Regra de seguranca: o token admin e usado apenas no servidor (fetch server-side), nunca no browser.
