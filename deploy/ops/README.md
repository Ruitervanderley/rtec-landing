# Deploy OPS Stack

Este diretório contém artefatos para subir painel + API na Oracle VPS com Cloudflare Tunnel.

## Arquivos

- `docker-compose.yml` - serviços `ops-api`, `painel-web`, `cloudflared`
- `.env.example` - variáveis obrigatórias
- `deploy.sh` - build + up
- `cloudflared/config.yml` - exemplo de ingress por hostname

## Uso rápido

```bash
cp .env.example .env
# editar secrets
bash deploy.sh
```

## Domínios esperados

- `painel.rtectecnologia.com.br` -> painel web
- `api.rtectecnologia.com.br` -> API operacional
