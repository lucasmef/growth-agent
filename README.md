# Growth Agent

Blueprint inicial da V1 do produto SaaS `Growth Agent`.

Objetivo da V1:
- planejar estratégia editorial para Instagram e TikTok;
- gerar ideias e drafts com IA;
- exigir aprovação humana em 100% dos posts;
- publicar/agendar via `bundle.social`;
- ingerir analytics via `bundle.social`;
- otimizar o próximo ciclo de conteúdo com base no histórico.

## Stack recomendada

- `Next.js 16.x`
- `React 19.2`
- `TypeScript`
- `Clerk`
- `Vercel AI SDK 6`
- `Trigger.dev` estável
- `PostgreSQL`
- `Prisma 6.x`
- `bundle.social`
- `Zod`
- `Sentry`
- `Vitest` + `Playwright`

## Princípios

- modular monolith na V1;
- tudo em TypeScript quando possível;
- baixo acoplamento a provider de IA e ao `bundle.social`;
- aprovação humana obrigatória antes de publicar;
- jobs idempotentes com retry;
- logs de decisão e outputs estruturados.

## Estrutura

- [Arquitetura](C:/Users/lucas/OneDrive/Documentos/IA/docs/architecture.md)
- [ADR 001 - Modular Monolith](C:/Users/lucas/OneDrive/Documentos/IA/docs/adr/001-modular-monolith.md)
- [ADR 002 - Stack](C:/Users/lucas/OneDrive/Documentos/IA/docs/adr/002-stack.md)
- [ADR 003 - Agent Runtime](C:/Users/lucas/OneDrive/Documentos/IA/docs/adr/003-agent-runtime.md)
- [Prisma Schema](C:/Users/lucas/OneDrive/Documentos/IA/prisma/schema.prisma)

## Bounded Contexts

- `identity`
- `workspace`
- `project`
- `strategy`
- `planning`
- `content`
- `approval`
- `publishing`
- `analytics`
- `agent-ops`

## Estrutura de pastas proposta

```text
docs/
  adr/
prisma/
src/
  app/
  contracts/
  integrations/
    ai/
    bundle/
  lib/
  modules/
    identity/
    workspace/
    project/
    strategy/
    planning/
    content/
    approval/
    publishing/
    analytics/
    agent-ops/
trigger/
  jobs/
```

## Regra central da V1

Nenhum conteúdo pode ser publicado ou agendado sem `Approval.status = APPROVED`.
