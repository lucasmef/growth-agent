# ADR 002: Stack padrão da V1

## Status

Accepted

## Decisão

Usar:

- `Next.js 16.x`
- `React 19.2`
- `TypeScript`
- `AI SDK 5`
- `Trigger.dev` estável
- `PostgreSQL`
- `Prisma`
- `bundle.social`
- `Zod`
- `Sentry`

## Justificativa

- `Next.js` entrega UI, API e SSR com ótima velocidade de desenvolvimento.
- `TypeScript` reduz ambiguidade em domínio, integrações e jobs.
- `AI SDK 5` ajuda a manter baixo acoplamento ao provider.
- `Trigger.dev` resolve jobs, retries e cron sem criar infra extra na V1.
- `PostgreSQL` + `Prisma` equilibram robustez e DX.
- `bundle.social` reduz custo de integração com múltiplas plataformas.

## Alternativas consideradas

- `NestJS` separado:
  mais estrutura, mas desacelera a V1.
- `Drizzle` em vez de Prisma:
  bom tecnicamente, mas Prisma tende a acelerar mais o começo.
- `Temporal` em vez de Trigger.dev:
  mais poderoso, mas mais complexo para a fase atual.
