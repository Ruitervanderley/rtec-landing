# NOC API – MVP NOC-as-a-Service

Backend orientado a **serviço operacional**: transforma eventos técnicos em **incidentes** com impacto operacional explicado (não só falha de dispositivo).
Conceito: **Eventos → Correlação → Diagnóstico → Incidente (impacto + ação recomendada + confiança)**.

## Stack

- Node.js + TypeScript
- PostgreSQL + Drizzle ORM
- Express (REST)
- Motor de diagnóstico (correlação em janela de tempo)

## Requisitos

- Node.js 20+
- PostgreSQL (local ou container)

## Configuração

1. Crie um banco PostgreSQL (ex.: `createdb noc`).
2. Defina `DATABASE_URL` (ex.: `postgresql://localhost:5432/noc`).
3. Instale dependências e aplique o schema no PostgreSQL:

```bash
cd noc-api
npm install
```

Aplique as migrations manualmente (ordem: 0000, 0001):

```bash
psql "$DATABASE_URL" -f src/db/migrations/0000_initial.sql
psql "$DATABASE_URL" -f src/db/migrations/0001_operational.sql
```

4. Inicie a API:

```bash
npm run dev
```

A API sobe em **http://localhost:4000** (ou `PORT`).

## Rotas

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/ingest-event` | Recebe evento do agente (monitorbot). Body: `{ device_id, tipo, valor? }`. Tipos: `ping_fail`, `high_latency`, `packet_loss`, `offline`, `temp_high`. |
| GET | `/incidents` | Lista incidentes. Query: `?status=open|investigating|resolved`, `?limit=50`. |
| GET | `/devices/:id/status` | Status atual interpretado do dispositivo (últimos eventos + incidentes abertos). |
| POST | `/devices` | Cria dispositivo (simulação). Body: `{ nome, tipo, local, ip, cliente_id? }`. Tipos: `router`, `camera`, `switch`, `server`. |
| GET | `/services` | Lista todos os serviços. |
| POST | `/services` | Cadastra serviço. Body: `{ nome, criticidade }`. Criticidade: `baixa`, `media`, `alta`, `critica`. |
| GET | `/services/:id` | Detalhe do serviço com dispositivos vinculados e incidentes abertos. |
| POST | `/services/:id/devices` | Associa dispositivo ao serviço. Body: `{ device_id }`. |
| DELETE | `/services/:id/devices/:deviceId` | Remove dispositivo do serviço. |
| GET | `/health` | Health check. |

## Modelo operacional

- **Site** (id, nome, cliente) → **Area** (id, site_id, nome) → **Device** (opcionalmente area_id).
- **Service** (id, nome, criticidade: baixa|media|alta|critica) ←→ **Device** via **ServiceDevice** (mapeia dispositivos ao serviço).

**Incident** inclui: titulo, descricao, severidade, status, causa_provavel, impacto_cliente, **impacto_operacional**, **usuario_afetado**, **acao_recomendada**, **confianca_diagnostico** (0–1).
Objetivo: menos alertas, mais explicações.

## Motor de diagnóstico (impacto operacional)

O motor é orientado a **serviço**, não só a dispositivo. Regras (janela 5 min):

- **Várias câmeras/dispositivos do mesmo Service offline** → "Vigilância indisponível" (ou nome do serviço).
- **Gateway (router) offline + vários dispositivos no mesmo site** → "Queda geral de conectividade".
- **Latência alta sem queda** → "Degradação perceptível ao usuário".
- **Vários dispositivos offline na mesma área** → "Queda provável de energia ou uplink".

Cada incidente traz: impacto operacional, usuário afetado, ação recomendada e confiança do diagnóstico.
Nenhuma lógica de diagnóstico fica no frontend; tudo roda no backend.

## Teste rápido (eventos simulados)

```bash
# 1. Criar um dispositivo
curl -X POST http://localhost:4000/devices \
  -H "Content-Type: application/json" \
  -d '{"nome":"Router Catalão","tipo":"router","local":"Catalão - GO","ip":"192.168.1.1"}'
# Anote o "id" retornado.

# 2. Enviar 3 ping_fail (dispara regra "Dispositivo offline")
curl -X POST http://localhost:4000/ingest-event \
  -H "Content-Type: application/json" \
  -d '{"device_id":"<ID>","tipo":"ping_fail"}'
# Repita 2 vezes (3 eventos no total).

# 3. Listar incidentes
curl http://localhost:4000/incidents
```

## Estrutura

- `src/db/` – schema Drizzle (devices, events, incidents, sites, areas, services, service_devices), migrations, client
- `src/engine/` – **buildContext.ts** (contexto evento+dispositivo+área+serviço), **rules.ts** (regras sem side-effect), **diagnosticEngine.ts** (orquestra contexto → regras → criação de incidentes)
- `src/routes/` – ingest, incidents, devices

Sem autenticação, multi-empresa ou billing neste MVP.

## App do técnico (noc-app)

No repositório há um app Next.js em **`noc-app/`** para o técnico visualizar serviços: lista de serviços e detalhe (dispositivos + incidentes abertos). Consome a NOC API. Ver `noc-app/README.md`.

## Modulo OPS (v1)

Este backend agora tambem expoe endpoints operacionais para o ecossistema LegislativoTimer:

- `POST /v1/device/provision` - emite `device_token` para notebook autorizado.
- `POST /v1/device/heartbeat` - heartbeat periodico do notebook.
- `POST /v1/backups/request-upload` - gera URL assinada para upload no R2.
- `POST /v1/backups/complete` - confirma upload (`UPLOADED`/`FAILED`).
- `GET /v1/admin/overview` - resumo operacional.
- `GET /v1/admin/devices` - dispositivos e status online/offline.
- `GET /v1/admin/backups` - trilha de backups.
- `GET /v1/admin/tenants` - agregacao por tenant/licenca.

### Variaveis extras (OPS)

| Variavel | Uso |
|---|---|
| `OPS_ADMIN_SERVICE_TOKEN` | Token interno usado pelo painel web para endpoints admin. |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Assinatura e armazenamento dos backups no Cloudflare R2. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Alertas operacionais (offline/falha de backup). |

### Migracoes OPS

Aplicar tambem:

```bash
psql "$DATABASE_URL" -f src/db/migrations/0002_ops.sql
```

### Jobs embutidos

Quando a API inicia, executa jobs em background:

- varredura de dispositivo offline (>15 min sem heartbeat), com alerta deduplicado;
- retencao de backups (remove registros antigos; tenta apagar objeto no R2).
