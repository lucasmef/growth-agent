# Growth Agent

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-20232A?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma)
![Trigger.dev](https://img.shields.io/badge/Trigger.dev-4.4-6D28D9?style=for-the-badge)
![OpenAI](https://img.shields.io/badge/OpenAI-AI%20SDK%206-111111?style=for-the-badge)

Base operacional para um SaaS de growth content com IA, aprovacao humana e automacao de publicacao para Instagram e TikTok.

O projeto combina onboarding estrategico, geracao de conteudo, fluxo de aprovacao, publicacao, analytics e um `Admin Lab` para rodar experimentos autonomos e transformar resultados em `Publication Profiles` reutilizaveis.

## O que este projeto entrega

- onboarding de workspace, projeto e estrategia editorial;
- dashboard para operacao inicial da conta;
- geracao de pilares, calendario semanal e drafts com IA;
- aprovacao manual obrigatoria para projetos de clientes;
- integracao com `bundle.social` para contas, agendamento, publicacao e analytics;
- `Admin Lab` para experimentos controlados com `AUTO_APPROVE`;
- promocao de setups vencedores para `Publication Profiles`;
- arquitetura modular preparada para escalar sem perder clareza de dominio.

## Principais funcionalidades

### 1. Fluxo cliente

- criacao de `workspace` e `project`;
- captura de nicho, publico, tom de voz, objetivos e guardrails;
- configuracao e atualizacao de estrategia;
- geracao de pilares de conteudo;
- geracao de calendario editorial semanal;
- criacao de drafts por slot do calendario;
- aprovacao, pedido de ajustes, agendamento e publicacao.

### 2. Integracao operacional

- sincronizacao de contas sociais;
- link para portal de conexao das redes;
- upload de assets para publicacao;
- sincronizacao de status de publicacao;
- ingestao de analytics por rotas e jobs;
- webhook dedicado para eventos do `bundle.social`.

### 3. Admin Lab

- workspaces internos do tipo `ADMIN_LAB`;
- projetos em modo `EXPERIMENT`;
- execucao de ciclos autonomos;
- acompanhamento de experimentos em andamento;
- promocao de experimentos para `Publication Profiles`;
- ranking interno de perfis operacionais vencedores.

## Stack

### Aplicacao

- `Next.js 16`
- `React 19`
- `TypeScript`
- `App Router`

### Backend e dominio

- `Prisma ORM`
- `SQLite` para bootstrap local rapido
- `PostgreSQL` para ambientes persistentes
- `Zod` para contratos e validacao

### IA e automacao

- `AI SDK 6`
- `@ai-sdk/openai`
- `Trigger.dev`

### Auth e integracoes

- `Clerk`
- `bundle.social`

## Arquitetura em uma frase

Um `modular monolith` com separacao clara entre operacao de clientes e experimentacao interna, preservando o guardrail central: projetos reais exigem aprovacao humana explicita antes de qualquer publicacao.

## Estrutura do projeto

```text
src/
  app/             # UI, rotas, server actions e APIs
  modules/         # dominios de negocio
  integrations/    # adapters de IA e bundle.social
  contracts/       # tipos e contratos compartilhados
  lib/             # env, db e utilitarios
trigger/
  jobs/            # jobs assincronos e rotinas operacionais
prisma/
  schema*          # modelos e persistencia
docs/
  architecture.md  # blueprint da solucao
  adr/             # decisoes arquiteturais
```

## Modulos de dominio

- `identity`
- `workspace`
- `project`
- `strategy`
- `planning`
- `content`
- `publishing`
- `analytics`
- `agent-ops`
- `admin-lab`
- `profiles`

## Como rodar localmente

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variaveis de ambiente

Use o arquivo [`.env.example`](./.env.example) como base.

Atalhos uteis para desenvolvimento local:

- `DEV_AUTH_BYPASS=true` habilita sessao local sem depender do Clerk;
- `DEV_AUTH_EMAIL` define o usuario de desenvolvimento;
- `PLATFORM_ADMIN_EMAILS` libera acesso ao `Admin Lab`;
- `DATABASE_URL=file:./prisma/dev.db` sobe a base local com SQLite.

## Scripts principais

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm db:push
pnpm db:seed
pnpm trigger:dev
pnpm trigger:deploy
```

## Documentacao

- [Arquitetura](./docs/architecture.md)
- [ADR 001 - Modular Monolith](./docs/adr/001-modular-monolith.md)
- [ADR 002 - Stack](./docs/adr/002-stack.md)
- [ADR 003 - Agent Runtime](./docs/adr/003-agent-runtime.md)
- [ADR 004 - Admin Lab and Publication Profiles](./docs/adr/004-admin-lab-and-publication-profiles.md)

## Diferenciais da base

- guardrails de aprovacao embutidos no dominio;
- separacao entre conta de cliente e laboratorio de experimentos;
- publication profiles como ativo reutilizavel de aprendizado;
- integracoes externas isoladas em adapters;
- base pronta para evoluir de scaffold para produto operacional.

## Status

O repositorio ja cobre o nucleo da V1 e a fundacao do `Admin Lab`, com UI inicial, APIs, modelos Prisma, seed local e jobs operacionais. O proximo passo natural e aprofundar os fluxos automatizados, observabilidade e maturidade de publicacao em producao.
