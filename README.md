# Rtec Tecnologia – Landing Page

Landing page institucional da **Rtec Tecnologia**, com foco em infraestrutura, cloud e Inteligência Artificial. Site responsivo, multilíngue (pt/en e fr) e otimizado para conversão com CTAs para WhatsApp.

## Tecnologias

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4**
- **next-intl** (i18n: português, inglês, francês)
- **Drizzle ORM** + PGLite (dev) / PostgreSQL (produção)

## Requisitos

- Node.js 20+
- npm

## Como rodar

### Desenvolvimento

```bash
npm install
npm run dev
```

O app sobe em **http://localhost:5000**. O script `dev` inicia o banco PGLite, aplica as migrações e sobe o Next.js e o Spotlight.

### Build para produção

```bash
npm run build
npm run start
```

Configure `DATABASE_URL` no ambiente para um PostgreSQL em produção. As migrações rodam no build.

## Variáveis de ambiente

No `.env` (e em produção no seu provedor):

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | URL do PostgreSQL (produção) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Sim | Chave pública do Clerk |
| `CLERK_SECRET_KEY` | Sim | Chave secreta do Clerk |
| `NEXT_PUBLIC_WHATSAPP_URL` | Não | Link do WhatsApp para os CTAs (ex.: `https://wa.me/message/...`) |

As demais variáveis seguem o [Next.js Boilerplate](https://github.com/ixartz/Next-js-Boilerplate).

## Estrutura da landing

- **Hero** – Título, subtítulo e CTA principal (WhatsApp)
- **Sobre Nós** – Trajetória e pilares (desde 2018, operação global, IA, cloud)
- **Serviços** – Agentes de IA, infraestrutura cloud, integração de sistemas
- **Benefícios** – Redução de custos, escalabilidade, segurança
- **Como trabalhamos** – Diagnóstico, proposta, entrega, suporte
- **FAQ** – Accordion com perguntas frequentes
- **CTA final** – Chamada para contato via WhatsApp

Inclui ainda: botão flutuante WhatsApp, botão voltar ao topo, link do sitemap no footer, SEO (meta, Open Graph, JSON-LD) e acessibilidade (skip link, landmarks, contraste).

## Deploy na Cloudflare Pages

O deploy na Cloudflare Pages usa **static export**: o build gera a pasta `out` com HTML/CSS/JS estáticos. Use o script dedicado; o build normal (`npm run build`) não gera `out`.

**No repositório:** envie o código para o GitHub (ex.: `git push`) para que a Cloudflare clone o commit que contém o script `build:pages`.

**No painel da Cloudflare Pages:**

1. **Workers & Pages** → seu projeto → **Settings** → **Builds & deployments**.
2. **Build command:** `npm run build:pages`
3. **Build output directory:** `out`
4. **Deploy command:** deixe em branco (a Pages publica o conteúdo de `out` automaticamente).

O `build:pages` ativa o static export do Next.js, troca temporariamente rotas/componentes que usam API ou auth por versões estáticas e gera a pasta `out`. Para outros hosts (Vercel, Node, etc.), continue usando `npm run build` e `npm run start`.

## Scripts principais

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Sobe PGLite, migrações, Next (porta 5000) e Spotlight |
| `npm run build` | Migrações + build de produção (servidor/outros hosts) |
| `npm run build:pages` | Build com static export para Cloudflare Pages (gera pasta `out`) |
| `npm run start` | Sobe o app em modo produção |
| `npm run lint` | ESLint |
| `npm run check:types` | Verificação TypeScript |
| `npm run check:deps` | Knip (arquivos/deps não usados) |

## Licença

MIT. Projeto gerado a partir do [Next.js Boilerplate](https://github.com/ixartz/Next-js-Boilerplate).
