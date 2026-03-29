# Growth Agent

Blueprint inicial do produto SaaS `Growth Agent`.

## Objetivo da V1

- planejar estrategia editorial para Instagram e TikTok;
- gerar ideias e drafts com IA;
- exigir aprovacao humana em 100% dos posts de clientes;
- publicar e agendar via `bundle.social`;
- ingerir analytics via `bundle.social`;
- otimizar o proximo ciclo de conteudo com base no historico.

## Extensao de produto ja prevista

- acesso de `platform admin` para operacao interna;
- `admin lab` para rodar testes autonomos em contas novas;
- promocao de testes vencedores para `publication profiles`;
- clientes escolhendo um perfil operacional pronto para suas contas.

## Stack recomendada

- `Next.js 16.x`
- `React 19.2`
- `TypeScript`
- `Clerk`
- `Vercel AI SDK 6`
- `Trigger.dev` estavel
- `PostgreSQL`
- `Prisma 6.x`
- `bundle.social`
- `Zod`
- `Sentry`
- `Vitest` + `Playwright`

## Principios

- modular monolith na V1;
- tudo em TypeScript quando possivel;
- baixo acoplamento a provider de IA e ao `bundle.social`;
- separacao explicita entre projetos de cliente e projetos de experimento;
- jobs idempotentes com retry;
- logs de decisao e outputs estruturados.

## Estrutura

- [Arquitetura](C:/Users/lucas/OneDrive/Documentos/IA/docs/architecture.md)
- [ADR 001 - Modular Monolith](C:/Users/lucas/OneDrive/Documentos/IA/docs/adr/001-modular-monolith.md)
- [ADR 002 - Stack](C:/Users/lucas/OneDrive/Documentos/IA/docs/adr/002-stack.md)
- [ADR 003 - Agent Runtime](C:/Users/lucas/OneDrive/Documentos/IA/docs/adr/003-agent-runtime.md)
- [ADR 004 - Admin Lab and Publication Profiles](C:/Users/lucas/OneDrive/Documentos/IA/docs/adr/004-admin-lab-and-publication-profiles.md)
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
- `admin-lab`
- `profiles`

## Regra central

Projetos de cliente usam `approvalMode = MANUAL_REQUIRED`.

Excecao controlada:
- projetos internos de experimento, operados por `platform admin` dentro de `workspace.type = ADMIN_LAB`, podem usar `approvalMode = AUTO_APPROVE` para rodar testes autonomos e alimentar `publication profiles`.

## Bootstrap local

1. Copie [`.env.example`](C:/Users/lucas/OneDrive/Documentos/IA/.env.example) para `.env`.
2. Rode `pnpm db:push` e depois `pnpm db:seed`.
3. Suba a app com `pnpm dev`.

Modo local sem chaves:
- `DEV_AUTH_BYPASS=true` libera uma sessao local sem Clerk.
- `DEV_AUTH_EMAIL` define o usuario local.
- `PLATFORM_ADMIN_EMAILS` pode apontar para esse mesmo email para liberar o admin lab.

O seed cria:
- um workspace cliente com projeto, estrategia, calendario, conteudo, approval, publication e analytics;
- um `ADMIN_LAB` com experimento promovido para `PublicationProfile`;
- um usuario local admin coerente com o modo de desenvolvimento.
