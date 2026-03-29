# Architecture Blueprint

## 1. Visão geral

O `Growth Agent` V1 deve ser implementado como um `modular monolith` com dois runtimes:

- `Next.js`: UI, APIs, auth, leitura/escrita do domínio, dashboard e webhooks.
- `Trigger.dev`: jobs assíncronos, cron, retries, backfill e observabilidade operacional.

Integrações externas:

- `bundle.social`: conexão de contas, scheduling, publishing, analytics, webhooks.
- provider de IA via `AI SDK 6`.

Persistência:

- `PostgreSQL` como source of truth.
- `Prisma` como ORM principal.

## 2. Diagrama textual

```text
User
  -> Web App (Next.js)
    -> Route Handlers / Server Actions
      -> Application Services
        -> Domain Modules
          -> Prisma/PostgreSQL
          -> AI Gateway
          -> Bundle Gateway
          -> Trigger Task Dispatcher

bundle.social
  -> webhook /api/webhooks/bundle
    -> verifier + idempotency
      -> domain event mapping
        -> update publication/account state
        -> enqueue sync/recovery jobs

Trigger.dev
  -> generate strategy
  -> generate weekly calendar
  -> generate drafts
  -> schedule/publish approved content
  -> sync analytics
  -> generate optimization insights
```

## 3. Camadas

### Presentation

Responsabilidades:
- onboarding;
- dashboard;
- calendário;
- review/approval;
- project settings;
- histórico e logs.

### Application

Responsabilidades:
- coordenar use cases;
- garantir idempotência de fluxos;
- aplicar políticas de autorização;
- chamar ports de infra.

Use cases principais:
- `CreateProject`
- `ConnectSocialAccount`
- `CompleteStrategicOnboarding`
- `GenerateContentPillars`
- `GenerateWeeklyCalendar`
- `GenerateContentDraft`
- `ApproveContent`
- `RequestContentChanges`
- `ScheduleApprovedContent`
- `PublishContentNow`
- `SyncProjectAnalytics`
- `GenerateOptimizationInsights`

### Domain

Responsabilidades:
- entidades e enums;
- regras de estado;
- políticas editoriais;
- validações de negócio;
- score simplificado de performance.

Regras centrais:
- conteúdo só agenda/publica após aprovação;
- publicação é sempre vinculada a um projeto e a uma conta social elegível;
- analytics não altera conteúdo histórico, apenas gera snapshots e insights;
- decisões do agente precisam ser logadas.

### Infrastructure

Responsabilidades:
- Prisma/Postgres;
- Trigger.dev;
- adapters de IA;
- adapter do `bundle.social`;
- observabilidade;
- gerenciamento de secrets.

## 4. Serviços e módulos

### `identity`
- autenticação;
- sessão;
- papéis básicos.

### `workspace`
- organização do tenant;
- membros e roles.

### `project`
- perfil do cliente/case;
- vínculo com `bundleTeamId`;
- contas sociais conectadas.

### `strategy`
- nicho;
- ICP;
- objetivos;
- tom de voz;
- regras editoriais;
- restrições.

### `planning`
- pilares;
- calendário semanal;
- brief por slot.

### `content`
- ideias;
- content items;
- versões de draft;
- asset brief.

### `approval`
- aprovação manual;
- pedido de ajustes;
- trilha de decisão humana.

### `publishing`
- scheduling;
- publicação;
- reconciliação de status.

### `analytics`
- snapshots por conta e por post;
- métricas normalizadas;
- histórico.

### `agent-ops`
- execuções;
- logs de decisão;
- prompt/model versioning;
- observabilidade do agente.

## 5. Fluxos principais

### Fluxo 1: onboarding do projeto

1. Usuário cria `workspace`.
2. Usuário cria `project`.
3. Sistema cria ou associa `bundleTeamId`.
4. Usuário conecta Instagram e/ou TikTok.
5. Usuário preenche onboarding estratégico.
6. Job gera `ProjectStrategy`, pilares e recomendação inicial de calendário.

### Fluxo 2: planejamento semanal

1. Usuário dispara geração da semana.
2. Job lê estratégia + analytics + histórico recente.
3. Sistema gera `CalendarWeek` e `CalendarSlot`.
4. Cada slot recebe objetivo, formato, plataforma e brief.

### Fluxo 3: geração e aprovação de post

1. Usuário ou cron dispara geração de draft.
2. Job chama `AI Gateway` com schema estruturado.
3. Sistema salva `ContentVersion`.
4. Conteúdo entra em `DRAFT_READY`.
5. Revisor aprova ou pede alterações.
6. Ao aprovar, item pode ser agendado/publicado.

### Fluxo 4: publicação

1. Item aprovado recebe horário.
2. Use case chama `BundleGateway.schedulePost`.
3. Sistema salva `Publication`.
4. Webhook ou polling atualiza status final.

### Fluxo 5: analytics e otimização

1. Cron diário e webhooks disparam sync.
2. Sistema salva `AnalyticsSnapshot`.
3. Job calcula insights simples.
4. Próximo ciclo de planejamento consome esses sinais.

## 6. Estrutura de pastas

```text
src/
  app/
    (marketing)/
    (app)/
    api/
      projects/
      content/
      analytics/
      webhooks/
  modules/
    project/
      domain/
      application/
      infrastructure/
    strategy/
    planning/
    content/
    approval/
    publishing/
    analytics/
    agent-ops/
  integrations/
    ai/
      ai-gateway.ts
      providers/
    bundle/
      bundle-gateway.ts
      bundle-client.ts
      bundle-webhook.ts
  contracts/
  lib/
trigger/
  jobs/
    strategy/
    planning/
    content/
    publishing/
    analytics/
    ops/
```

## 7. Endpoints principais

### Auth e tenant
- `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId`
- `POST /api/workspaces/:workspaceId/projects`

### Project e onboarding
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
- `PATCH /api/projects/:projectId/strategy`
- `POST /api/projects/:projectId/pillars/generate`
- `POST /api/projects/:projectId/calendar/generate`

### Social accounts
- `POST /api/projects/:projectId/social-accounts/connect-link`
- `GET /api/projects/:projectId/social-accounts`
- `POST /api/projects/:projectId/social-accounts/:socialAccountId/refresh`

### Conteúdo
- `POST /api/projects/:projectId/content`
- `GET /api/projects/:projectId/content`
- `GET /api/content/:contentItemId`
- `POST /api/content/:contentItemId/generate-draft`
- `POST /api/content/:contentItemId/request-changes`
- `POST /api/content/:contentItemId/approve`
- `POST /api/content/:contentItemId/schedule`
- `POST /api/content/:contentItemId/publish-now`

### Analytics
- `GET /api/projects/:projectId/dashboard`
- `GET /api/projects/:projectId/analytics`
- `POST /api/projects/:projectId/analytics/sync`

### Webhooks
- `POST /api/webhooks/bundle`

## 8. Jobs e crons

Jobs:
- `strategy.generate-project-strategy`
- `strategy.generate-pillars`
- `planning.generate-weekly-calendar`
- `content.generate-draft`
- `content.regenerate-draft`
- `publishing.schedule-approved-content`
- `publishing.publish-now`
- `publishing.reconcile-publication-status`
- `analytics.sync-social-account`
- `analytics.sync-post`
- `analytics.backfill-project`
- `analytics.generate-optimization-insights`
- `ops.reprocess-stuck-items`

Crons:
- diário 06:00: sync de analytics recentes;
- diário 07:00: reconciliação de publicações pendentes;
- semanal domingo 18:00: gerar calendário da próxima semana;
- horário: retry de itens falhados/transientes.

## 9. Eventos e webhooks

Eventos internos:
- `project.created`
- `strategy.completed`
- `pillars.generated`
- `calendar.generated`
- `content.draft.generated`
- `content.approved`
- `content.changes_requested`
- `publication.scheduled`
- `publication.published`
- `publication.failed`
- `analytics.synced`
- `optimization.generated`

Eventos externos esperados do `bundle.social`:
- `socialAccount.connected`
- `socialAccount.disconnected`
- `post.scheduled`
- `post.published`
- `post.failed`
- `analytics.updated`

## 10. Guardrails de IA

- saída sempre em `JSON` estruturado por `Zod`;
- prompts versionados e rastreáveis;
- proibição de publicar sem aprovação;
- validação por plataforma antes do agendamento;
- checagem de duplicidade semântica contra últimos posts;
- lista de tópicos banidos e claims proibidos por projeto;
- limite de custo por job e por projeto;
- fallback de provider/model configurável;
- log de insumos usados na decisão do agente.

## 11. Critérios de aceite da V1

- autenticação funcional com isolamento por workspace;
- criação de projeto e conexão de ao menos uma conta social;
- onboarding estratégico persistido;
- geração de pilares;
- geração de calendário semanal;
- geração de draft com `hook`, `script`, `caption`, `CTA` e `hashtags`;
- aprovação manual obrigatória antes de qualquer publicação;
- scheduling/publicação via `bundle.social` com retry;
- ingestão de analytics e dashboard básico;
- logs de runs e decisões acessíveis para troubleshooting.

## 12. Roadmap técnico por fases

### Fase 0: fundação
- scaffold do projeto;
- auth;
- schema e migrations;
- observabilidade mínima;
- adapters externos.

### Fase 1: onboarding e estratégia
- projeto;
- contas sociais;
- estratégia;
- pilares.

### Fase 2: planejamento e drafts
- calendário semanal;
- geração de slots;
- geração de drafts;
- review UI.

### Fase 3: publishing
- aprovação;
- agendamento;
- publicação;
- reconciliação de estado.

### Fase 4: analytics e otimização
- snapshots;
- dashboard;
- insights do agente para próximo ciclo.

### Fase 5: expansão
- múltiplos perfis por workspace;
- novas plataformas;
- testes A/B;
- agentes especializados.

## 13. Riscos técnicos e mitigação

- Dependência do `bundle.social`:
  mitigar com `BundleGateway` e contrato interno estável.
- Saída inconsistente de IA:
  mitigar com schema estruturado, retries limitados e revisão humana.
- Estados quebrados entre UI, jobs e webhooks:
  mitigar com state machine simples, idempotência e reconciliação periódica.
- Crescimento do monólito sem fronteiras:
  mitigar com módulos, contratos e ADRs.
- Analytics incompleto ou atrasado:
  mitigar com snapshots, polling e backfill.

## 14. Naming sugerido

Produto:
- `Growth Agent` como codinome;
- possíveis nomes futuros: `Orbit Growth`, `SignalPilot`, `GrowthLoop`.

Subdomínios:
- `Strategy Engine`
- `Planning Engine`
- `Content Studio`
- `Approval Desk`
- `Publishing Hub`
- `Analytics Hub`
- `Agent Ops`
