import Link from "next/link";
import { notFound } from "next/navigation";

import { isBundleConfigured, isDatabaseConfigured } from "@/lib/env";
import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { getProjectForUser } from "@/modules/project/application/project.service";
import {
  ensureBundleTeamAction,
  generatePillarsAction,
  generateWeeklyCalendarAction,
  openBundlePortalAction,
  refreshBundleAccountsAction,
} from "./actions";

export const dynamic = "force-dynamic";

function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default async function ProjectDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ bundle?: string; planning?: string }>;
}) {
  if (!isDatabaseConfigured()) {
    return notFound();
  }

  const { projectId } = await params;
  const query = await searchParams;
  const appUser = await requireAppUser();

  let project;

  try {
    project = await getProjectForUser(appUser.id, projectId);
  } catch {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <p className="eyebrow">Projeto</p>
        <h1>{project.name}</h1>
        <p className="lede">
          {project.niche} · timezone {project.timezone}
        </p>
        <div className="actions">
          <Link className="button button-secondary" href="/dashboard">
            Voltar ao dashboard
          </Link>
        </div>
      </section>

      {query.bundle || query.planning ? (
        <section className="flash-banner">
          <p>
            {query.planning === "pillars-generated"
              ? "Pilares gerados e salvos no projeto."
              : query.planning === "calendar-generated"
                ? "Calendário semanal gerado com sucesso."
                : query.bundle === "connected"
              ? "Retorno do portal recebido. Agora sincronize para atualizar as contas locais."
              : query.bundle === "refreshed"
                ? "Contas sincronizadas com sucesso."
                : "Bundle team garantido com sucesso."}
          </p>
        </section>
      ) : null}

      <section className="grid">
        <article className="card">
          <h2>Workspace</h2>
          <p>{project.workspace.name}</p>
        </article>
        <article className="card">
          <h2>Objetivo principal</h2>
          <p>{project.strategy?.primaryGoal ?? "Não definido"}</p>
        </article>
        <article className="card">
          <h2>Tom de voz</h2>
          <p>{project.strategy?.toneOfVoice ?? "Não definido"}</p>
        </article>
        <article className="card">
          <h2>bundle.social</h2>
          <p>{project.bundleTeamId ?? "Team ainda não provisionado"}</p>
        </article>
      </section>

      <section className="card action-panel">
        <div>
          <p className="section-label">Social Accounts</p>
          <h2>Conexão via bundle.social</h2>
          <p className="muted">
            V1 usa o portal hospedado do bundle.social para conectar Instagram e TikTok com mais robustez.
          </p>
        </div>

        {!isBundleConfigured() ? (
          <p className="error-text">
            Configure `BUNDLE_SOCIAL_API_KEY` para habilitar criação de team, portal de conexão e sync.
          </p>
        ) : (
          <div className="actions">
            <form action={ensureBundleTeamAction.bind(null, project.id)}>
              <button className="button button-secondary" type="submit">
                Garantir team
              </button>
            </form>
            <form action={openBundlePortalAction.bind(null, project.id)}>
              <button className="button button-primary" type="submit">
                Conectar Instagram/TikTok
              </button>
            </form>
            <form action={refreshBundleAccountsAction.bind(null, project.id)}>
              <button className="button button-secondary" type="submit">
                Sincronizar contas
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="card action-panel">
        <div>
          <p className="section-label">Planning Engine</p>
          <h2>Pilares e calendário semanal</h2>
          <p className="muted">
            Gere a estrutura editorial base da semana. Se a chave de IA não estiver configurada, o sistema usa um fallback determinístico.
          </p>
        </div>

        <div className="actions">
          <form action={generatePillarsAction.bind(null, project.id)}>
            <button className="button button-secondary" type="submit">
              Gerar pilares
            </button>
          </form>
          <form action={generateWeeklyCalendarAction.bind(null, project.id)}>
            <button className="button button-primary" type="submit">
              Gerar calendário semanal
            </button>
          </form>
        </div>
      </section>

      <section className="details-grid">
        <article className="card">
          <p className="section-label">Pilares de conteúdo</p>
          {project.pillars.length ? (
            <div className="stack-sm">
              {project.pillars.map((pillar) => (
                <div className="subcard" key={pillar.id}>
                  <div>
                    <h3>
                      {pillar.name} · prioridade {pillar.priority}
                    </h3>
                    <p className="muted">{pillar.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhum pilar gerado ainda.</p>
          )}
        </article>

        <article className="card">
          <p className="section-label">Calendário atual</p>
          {project.calendarWeeks[0]?.slots.length ? (
            <div className="stack-sm">
              {project.calendarWeeks[0].slots.map((slot) => (
                <div className="subcard" key={slot.id}>
                  <div>
                    <h3>
                      {slot.platform} · {slot.format}
                    </h3>
                    <p className="muted">
                      {new Date(slot.plannedFor).toLocaleString("pt-BR")} ·{" "}
                      {slot.pillar?.name ?? "Sem pilar"}
                    </p>
                    <p className="muted">{slot.objective}</p>
                    <p className="muted">{slot.brief}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhum calendário semanal gerado ainda.</p>
          )}
        </article>
      </section>

      <section className="details-grid">
        <article className="card">
          <p className="section-label">Contas conectadas</p>
          {project.socialAccounts.length ? (
            <div className="stack-sm">
              {project.socialAccounts.map((account) => (
                <div className="subcard" key={account.id}>
                  <div>
                    <h3>
                      {account.platform} · {account.username ?? "sem username"}
                    </h3>
                    <p className="muted">
                      status {account.status} · bundle id {account.bundleSocialAccountId ?? "n/a"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhuma conta local sincronizada ainda.</p>
          )}
        </article>
      </section>

      <section className="details-grid">
        <article className="card">
          <p className="section-label">Agent Runs</p>
          {project.agentRuns.length ? (
            <div className="stack-sm">
              {project.agentRuns.map((run) => (
                <div className="subcard" key={run.id}>
                  <div>
                    <h3>
                      {run.kind} · {run.status}
                    </h3>
                    <p className="muted">
                      modelo {run.model ?? "n/a"} · prompt {run.promptVersion ?? "n/a"}
                    </p>
                    {run.decisionLogs.length ? (
                      <ul className="plain-list">
                        {run.decisionLogs.map((log) => (
                          <li key={log.id}>
                            {log.stepKey}: {log.summary}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhuma execução do agente registrada ainda.</p>
          )}
        </article>
      </section>

      <section className="details-grid">
        <article className="card">
          <p className="section-label">Público-alvo</p>
          <p>{project.strategy?.targetAudience ?? "Não definido"}</p>
        </article>
        <article className="card">
          <p className="section-label">Objetivos secundários</p>
          <ul className="plain-list">
            {readStringList(project.strategy?.secondaryGoals).length ? (
              readStringList(project.strategy?.secondaryGoals).map((goal) => (
                <li key={goal}>{goal}</li>
              ))
            ) : (
              <li>Sem itens</li>
            )}
          </ul>
        </article>
        <article className="card">
          <p className="section-label">Regras editoriais</p>
          <ul className="plain-list">
            {readStringList(project.strategy?.editorialRules).length ? (
              readStringList(project.strategy?.editorialRules).map((rule) => (
                <li key={rule}>{rule}</li>
              ))
            ) : (
              <li>Sem itens</li>
            )}
          </ul>
        </article>
        <article className="card">
          <p className="section-label">Guardrails</p>
          <ul className="plain-list">
            {readStringList(project.strategy?.bannedClaims).length ? (
              readStringList(project.strategy?.bannedClaims).map((claim) => (
                <li key={claim}>{claim}</li>
              ))
            ) : (
              <li>Sem claims proibidos</li>
            )}
          </ul>
        </article>
      </section>
    </main>
  );
}
