# Architecture Blueprint

## 1. Visao geral

O `Growth Agent` continua como um `modular monolith`, mas agora com dois modos operacionais claros:

- `client managed`: projetos reais de clientes, com aprovacao humana obrigatoria;
- `experiment`: projetos internos do time admin, usados para descobrir padroes vencedores.

Runtimes:

- `Next.js`: UI, APIs, auth, leitura/escrita do dominio, dashboard e webhooks.
- `Trigger.dev`: jobs assincronos, cron, retries, backfill e observabilidade operacional.

Integracoes externas:

- `bundle.social`: conexao de contas, scheduling, publishing, analytics, webhooks.
- provider de IA via `AI SDK 6`.
- auth via `Clerk`.

Persistencia:

- `PostgreSQL` como source of truth.
- `Prisma` como ORM principal.

## 2. Diagrama textual

```text
Client User
  -> Web App
    -> project(mode=CLIENT_MANAGED, approvalMode=MANUAL_REQUIRED)
      -> planning/content/review/publishing/analytics

Platform Admin
  -> Admin Lab
    -> workspace(type=ADMIN_LAB)
      -> project(mode=EXPERIMENT, approvalMode=AUTO_APPROVE)
        -> autonomous test loop
        -> analytics evaluation
        -> promote winning setup to PublicationProfile

PublicationProfile
  -> assigned to client projects
  -> seeds strategy/planning/publishing defaults
```

## 3. Camadas

### Presentation

Responsabilidades:
- onboarding;
- dashboard do cliente;
- review e aprovacao;
- admin lab;
- catalogo de publication profiles.

### Application

Responsabilidades:
- coordenar use cases;
- garantir idempotencia;
- aplicar autorizacao;
- aplicar policy gates por modo do projeto.

Use cases principais:
- `CreateProject`
- `AssignPublicationProfile`
- `GenerateContentPillars`
- `GenerateWeeklyCalendar`
- `GenerateContentDraft`
- `ApproveContent`
- `ScheduleApprovedContent`
- `RunExperimentCycle`
- `EvaluateExperiment`
- `PromoteExperimentToProfile`

### Domain

Responsabilidades:
- entidades e enums;
- regras de estado;
- politicas editoriais;
- policy gates por tipo de projeto;
- catalogo de profiles reutilizaveis.

Regras centrais:
- `CLIENT_MANAGED` exige `MANUAL_REQUIRED`;
- `EXPERIMENT` pode usar `AUTO_APPROVE`, mas apenas em `ADMIN_LAB`;
- `PublicationProfile` nao publica nada por si; ele apenas define o padrao operacional;
- experimentos promovem profiles, e profiles podem ser aplicados a projetos de clientes;
- decisoes do agente precisam ser logadas nos dois modos.

### Infrastructure

Responsabilidades:
- Prisma/Postgres;
- Trigger.dev;
- adapters de IA;
- adapter do `bundle.social`;
- observabilidade;
- secrets e feature flags.

## 4. Servicos e modulos

### `identity`
- autenticacao;
- sessao;
- `platformRole`.

### `workspace`
- tenant;
- membros e roles;
- `workspace.type = CUSTOMER | ADMIN_LAB`.

### `project`
- perfil gerenciado;
- `mode = CLIENT_MANAGED | EXPERIMENT`;
- `approvalMode = MANUAL_REQUIRED | AUTO_APPROVE`;
- vinculo com `bundleTeamId`.

### `profiles`
- `PublicationProfile`;
- presets de estrategia, planejamento e publicacao;
- guardrails e success criteria.

### `admin-lab`
- criacao de contas e projetos de teste;
- execucao de ciclos autonomos;
- analise de resultado;
- promocao para profile.

### `strategy`
- nicho;
- ICP;
- objetivos;
- tom de voz;
- restricoes.

### `planning`
- pilares;
- calendario semanal;
- brief por slot.

### `content`
- ideias;
- drafts;
- versoes;
- asset brief.

### `approval`
- aprovacao manual para cliente;
- bypass controlado para experimento auto-aprovado.

### `publishing`
- scheduling;
- publicacao;
- reconciliacao de status.

### `analytics`
- snapshots por conta e por post;
- metricas normalizadas;
- comparacao de experimentos.

### `agent-ops`
- execucoes;
- logs de decisao;
- prompt/model versioning;
- observabilidade do agente.

## 5. Fluxos principais

### Fluxo 1: cliente com profile escolhido

1. Usuario cria `workspace`.
2. Usuario cria `project`.
3. Usuario escolhe um `publicationProfile` opcional.
4. Sistema preenche defaults de estrategia, planejamento e publishing.
5. Usuario conecta Instagram e/ou TikTok.
6. Sistema gera plano, drafts e segue workflow manual.

### Fluxo 2: experimento autonomo do admin

1. `platform admin` cria `workspace.type = ADMIN_LAB`.
2. Admin cria `project.mode = EXPERIMENT`.
3. Projeto usa `approvalMode = AUTO_APPROVE`.
4. Jobs geram calendario, drafts e agendamento automaticamente.
5. Analytics entra por webhook e cron.
6. Sistema consolida resultado do experimento em `ExperimentRun`.

### Fluxo 3: promocao para publication profile

1. Admin encerra um `ExperimentRun`.
2. Sistema compara metricas vs baseline e success criteria.
3. Admin promove o setup vencedor para `PublicationProfile`.
4. O profile passa a aparecer para selecao em projetos de cliente.

## 6. Estrutura de pastas

```text
src/
  app/
    api/
      projects/
      content/
      analytics/
      admin/
      webhooks/
  modules/
    identity/
    workspace/
    project/
    profiles/
    admin-lab/
    strategy/
    planning/
    content/
    approval/
    publishing/
    analytics/
    agent-ops/
  integrations/
    ai/
    bundle/
  contracts/
  lib/
trigger/
  jobs/
    strategy/
    planning/
    content/
    publishing/
    analytics/
    admin-lab/
    ops/
```

## 7. Endpoints principais

### Cliente
- `POST /api/workspaces`
- `POST /api/workspaces/:workspaceId/projects`
- `PATCH /api/projects/:projectId/strategy`
- `POST /api/projects/:projectId/pillars/generate`
- `POST /api/projects/:projectId/calendar/generate`
- `POST /api/projects/:projectId/calendar-slots/:slotId/draft/generate`
- `POST /api/content/:contentItemId/approve`
- `POST /api/content/:contentItemId/request-changes`
- `POST /api/content/:contentItemId/schedule`
- `POST /api/content/:contentItemId/publish-now`
- `POST /api/projects/:projectId/publication-profile`

### Admin lab
- `POST /api/admin/workspaces`
- `POST /api/admin/projects`
- `POST /api/admin/projects/:projectId/experiment/start`
- `POST /api/admin/projects/:projectId/experiment/stop`
- `POST /api/admin/experiments/:experimentRunId/evaluate`
- `POST /api/admin/experiments/:experimentRunId/promote-profile`
- `GET /api/admin/publication-profiles`
- `POST /api/admin/publication-profiles`
- `PATCH /api/admin/publication-profiles/:profileId`

### Webhooks
- `POST /api/webhooks/bundle`

## 8. Jobs e crons

Jobs de cliente:
- `planning.generate-weekly-calendar`
- `content.generate-draft`
- `publishing.schedule-approved-content`
- `analytics.sync-post`

Jobs de admin lab:
- `admin-lab.bootstrap-experiment-project`
- `admin-lab.run-autonomous-cycle`
- `admin-lab.evaluate-experiment`
- `admin-lab.promote-profile`

Crons:
- diario: sync de analytics recentes;
- diario: reconciliacao de publicacoes pendentes;
- semanal: gerar calendario da proxima semana;
- horario: retry de itens falhados;
- horario no admin lab: continuar experimentos em execucao.

## 9. Guardrails de IA

- saida sempre em `JSON` estruturado por `Zod`;
- prompts versionados e rastreaveis;
- `AUTO_APPROVE` so pode existir em `ADMIN_LAB`;
- profiles nao removem guardrails de plataforma;
- limite de budget, volume e frequencia por projeto;
- kill switch para desligar experimentos autonomos;
- logs de insumo, decisao e publicacao para auditoria;
- feature flag para liberar profiles aos clientes.

## 10. Criterios de aceite dessa extensao

- existe `platform admin` separado de usuario comum;
- existe `workspace.type = ADMIN_LAB`;
- existe `project.mode = EXPERIMENT`;
- experimento pode operar sem aprovacao humana;
- experimento gera `ExperimentRun` com metricas e resumo;
- admin pode promover um setup para `PublicationProfile`;
- cliente pode associar um profile ao seu projeto;
- projetos de cliente continuam exigindo aprovacao manual.

## 11. Roadmap tecnico

### Fase A: fundacao de dominio
- adicionar `platformRole`, `workspace.type`, `project.mode`, `approvalMode`;
- adicionar `PublicationProfile` e `ExperimentRun`;
- isolar autorizacao admin.

### Fase B: admin lab
- painel admin;
- criacao de projetos de experimento;
- fluxo autonomo com auto-approve;
- analytics comparativo.

### Fase C: publication profiles
- promocao de experimento vencedor;
- catalogo de profiles;
- atribuicao de profile a projeto de cliente.

### Fase D: optimization engine
- score por profile;
- recomendacao automatica de profile;
- A/B entre profiles.
