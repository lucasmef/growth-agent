import Link from "next/link";
import { notFound } from "next/navigation";

import { isBundleConfigured, isDatabaseConfigured } from "@/lib/env";
import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { getProjectForUser } from "@/modules/project/application/project.service";
import { listActivePublicationProfiles } from "@/modules/profiles/application/profile.service";
import {
  approveContentAction,
  attachBundleAssetAction,
  assignPublicationProfileAction,
  ensureBundleTeamAction,
  generateDraftForSlotAction,
  generatePillarsAction,
  generateWeeklyCalendarAction,
  openBundlePortalAction,
  publishNowAction,
  refreshBundleAccountsAction,
  requestChangesAction,
  scheduleContentAction,
  syncPublicationAction,
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
  searchParams: Promise<{
    bundle?: string;
    planning?: string;
    content?: string;
    publishing?: string;
    profile?: string;
  }>;
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

  const activeProfiles = await listActivePublicationProfiles();

  const contentBySlotId = new Map(
    project.contentItems
      .filter((item) => item.calendarSlotId)
      .map((item) => [item.calendarSlotId as string, item]),
  );

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

      {query.bundle || query.planning || query.content || query.publishing || query.profile ? (
        <section className="flash-banner">
          <p>
            {query.profile === "assigned"
              ? "Publication profile atualizado com sucesso."
              : query.publishing === "asset-attached"
              ? "Asset anexado ao conteudo com sucesso."
              : query.publishing === "scheduled"
                ? "Conteudo enviado para agendamento via bundle.social."
                : query.publishing === "published-now"
                  ? "Conteudo enviado para publicacao imediata via bundle.social."
                  : query.publishing === "synced"
                    ? "Status da publicacao sincronizado com sucesso."
                    : query.content === "draft-generated"
              ? "Draft gerado e pronto para revisao."
              : query.content === "approved"
                ? "Conteudo aprovado com sucesso."
                : query.content === "changes-requested"
                  ? "Mudancas solicitadas para este conteudo."
                  : query.planning === "pillars-generated"
                    ? "Pilares gerados e salvos no projeto."
                    : query.planning === "calendar-generated"
                      ? "Calendario semanal gerado com sucesso."
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
          <p>{project.strategy?.primaryGoal ?? "Nao definido"}</p>
        </article>
        <article className="card">
          <h2>Tom de voz</h2>
          <p>{project.strategy?.toneOfVoice ?? "Nao definido"}</p>
        </article>
        <article className="card">
          <h2>bundle.social</h2>
          <p>{project.bundleTeamId ?? "Team ainda nao provisionado"}</p>
        </article>
      </section>

      <section className="card action-panel">
        <div>
          <p className="section-label">Publication Profile</p>
          <h2>Padrao operacional escolhido</h2>
          <p className="muted">
            Use um profile validado no admin lab para orientar estrategia, planejamento e publicacao.
          </p>
        </div>

        <form
          action={assignPublicationProfileAction.bind(null, project.id)}
          className="inline-form"
        >
          <select
            className="input"
            name="publicationProfileId"
            defaultValue={project.publicationProfileId ?? ""}
          >
            <option value="">Sem profile</option>
            {activeProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <button className="button button-secondary" type="submit">
            Salvar profile
          </button>
        </form>

        <p className="helper-text">
          Atual: {project.publicationProfile?.name ?? "nenhum profile associado"}
        </p>
      </section>

      <section className="card action-panel">
        <div>
          <p className="section-label">Social Accounts</p>
          <h2>Conexao via bundle.social</h2>
          <p className="muted">
            V1 usa o portal hospedado do bundle.social para conectar Instagram e TikTok com mais robustez.
          </p>
        </div>

        {!isBundleConfigured() ? (
          <p className="error-text">
            Configure `BUNDLE_SOCIAL_API_KEY` para habilitar criacao de team, portal de conexao e sync.
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
          <h2>Pilares e calendario semanal</h2>
          <p className="muted">
            Gere a estrutura editorial base da semana. Se a chave de IA nao estiver configurada, o sistema usa um fallback deterministico.
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
              Gerar calendario semanal
            </button>
          </form>
        </div>
      </section>

      <section className="details-grid">
        <article className="card">
          <p className="section-label">Pilares de conteudo</p>
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
          <p className="section-label">Calendario atual</p>
          {project.calendarWeeks[0]?.slots.length ? (
            <div className="stack-sm">
              {project.calendarWeeks[0].slots.map((slot) => {
                const contentItem = contentBySlotId.get(slot.id);

                return (
                  <div className="subcard subcard-block" key={slot.id}>
                    <div>
                      <h3>
                        {slot.platform} · {slot.format}
                      </h3>
                      <p className="muted">
                        {new Date(slot.plannedFor).toLocaleString("pt-BR")} · {slot.pillar?.name ?? "Sem pilar"}
                      </p>
                      <p className="muted">{slot.objective}</p>
                      <p className="muted">{slot.brief}</p>
                      <p className="muted">
                        draft status {contentItem?.status ?? "not-generated"}
                      </p>
                    </div>

                    <div className="actions">
                      <form action={generateDraftForSlotAction.bind(null, project.id, slot.id)}>
                        <button className="button button-secondary" type="submit">
                          {contentItem ? "Regenerar draft" : "Gerar draft"}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">Nenhum calendario semanal gerado ainda.</p>
          )}
        </article>
      </section>

      <section className="details-grid">
        <article className="card">
          <p className="section-label">Fila de conteudo</p>
          {project.contentItems.length ? (
            <div className="stack-sm">
              {project.contentItems.map((item) => {
                const latestVersion = item.versions[0];
                const latestApproval = item.approvals[0];
                const latestPublication = item.publications[0];
                const assetCount = item.assets.filter((asset) => asset.bundleUploadId).length;

                return (
                  <div className="subcard subcard-block" key={item.id}>
                    <div>
                      <h3>
                        {item.platform} · {item.format} · {item.status}
                      </h3>
                      <p className="muted">{item.title ?? item.calendarSlot?.objective ?? "Sem titulo"}</p>
                      <p className="muted">
                        slot {item.calendarSlot?.pillar?.name ?? "sem pilar"} ·{" "}
                        {item.calendarSlot
                          ? new Date(item.calendarSlot.plannedFor).toLocaleString("pt-BR")
                          : "sem slot"}
                      </p>
                      {latestVersion ? (
                        <div className="draft-preview">
                          <p>
                            <strong>Hook:</strong> {latestVersion.hook}
                          </p>
                          <p>
                            <strong>Caption:</strong> {latestVersion.caption}
                          </p>
                          <p>
                            <strong>CTA:</strong> {latestVersion.cta}
                          </p>
                          <p>
                            <strong>Hashtags:</strong> {readStringList(latestVersion.hashtags).join(", ")}
                          </p>
                        </div>
                      ) : (
                        <p className="muted">Nenhuma versao gerada ainda.</p>
                      )}
                      {latestApproval ? (
                        <p className="muted">
                          ultima decisao {latestApproval.status} em{" "}
                          {new Date(latestApproval.createdAt).toLocaleString("pt-BR")}
                        </p>
                      ) : null}
                      <p className="muted">
                        assets prontos {assetCount} Â· publicacao {latestPublication?.status ?? "nao iniciada"}
                      </p>
                      {latestPublication?.scheduledFor ? (
                        <p className="muted">
                          agendado para {new Date(latestPublication.scheduledFor).toLocaleString("pt-BR")}
                        </p>
                      ) : null}
                      {latestPublication?.publishedAt ? (
                        <p className="muted">
                          publicado em {new Date(latestPublication.publishedAt).toLocaleString("pt-BR")}
                        </p>
                      ) : null}
                      {latestPublication?.errorMessage ? (
                        <p className="error-text">{latestPublication.errorMessage}</p>
                      ) : null}
                    </div>

                    {latestVersion ? (
                      <div className="stack-sm">
                        {item.status === "DRAFT_READY" ||
                        item.status === "CHANGES_REQUESTED" ||
                        item.status === "APPROVED" ? (
                          <div className="actions">
                            {(item.status === "DRAFT_READY" ||
                              item.status === "CHANGES_REQUESTED") ? (
                              <form action={approveContentAction.bind(null, project.id, item.id)}>
                                <button className="button button-primary" type="submit">
                                  Aprovar
                                </button>
                              </form>
                            ) : null}
                            {(item.status === "DRAFT_READY" ||
                              item.status === "APPROVED") ? (
                              <form action={requestChangesAction.bind(null, project.id, item.id)}>
                                <button className="button button-secondary" type="submit">
                                  Pedir mudancas
                                </button>
                              </form>
                            ) : null}
                          </div>
                        ) : null}

                        <form
                          action={attachBundleAssetAction.bind(null, project.id, item.id)}
                          className="inline-form"
                        >
                          <input
                            className="input"
                            type="text"
                            name="bundleUploadId"
                            placeholder="bundle upload id"
                            required
                          />
                          <select className="input" name="assetType" defaultValue="VIDEO">
                            <option value="VIDEO">VIDEO</option>
                            <option value="IMAGE">IMAGE</option>
                          </select>
                          <button className="button button-secondary" type="submit">
                            Anexar asset
                          </button>
                        </form>

                        <p className="helper-text">
                          V1 usa asset manual: gere ou suba a midia no bundle.social e cole aqui o `uploadId`.
                        </p>

                        {item.status === "APPROVED" ? (
                          <div className="actions">
                            <form action={scheduleContentAction.bind(null, project.id, item.id)}>
                              <button className="button button-primary" type="submit">
                                Agendar no bundle
                              </button>
                            </form>
                            <form action={publishNowAction.bind(null, project.id, item.id)}>
                              <button className="button button-secondary" type="submit">
                                Publicar agora
                              </button>
                            </form>
                          </div>
                        ) : null}

                        {latestPublication ? (
                          <div className="actions">
                            <form action={syncPublicationAction.bind(null, project.id, item.id)}>
                              <button className="button button-secondary" type="submit">
                                Sincronizar publicacao
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">Nenhum conteudo gerado ainda.</p>
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
            <p className="muted">Nenhuma execucao do agente registrada ainda.</p>
          )}
        </article>
      </section>

      <section className="details-grid">
        <article className="card">
          <p className="section-label">Publico-alvo</p>
          <p>{project.strategy?.targetAudience ?? "Nao definido"}</p>
        </article>
        <article className="card">
          <p className="section-label">Objetivos secundarios</p>
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
