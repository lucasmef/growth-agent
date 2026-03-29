import Link from "next/link";
import { redirect } from "next/navigation";

import { isDatabaseConfigured } from "@/lib/env";
import { listAdminLabWorkspacesForUser } from "@/modules/admin-lab/application/admin-lab.service";
import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";
import { listPublicationProfileRankingsForAdmin } from "@/modules/profiles/application/profile-insights.service";

import {
  createAdminLabWorkspaceAction,
  createExperimentProjectAction,
  promoteExperimentToProfileAction,
  runAutonomousCycleAction,
  startExperimentRunAction,
  stopExperimentRunAction,
} from "./actions";

export const dynamic = "force-dynamic";

function readAdminFlashMessage(value?: string) {
  switch (value) {
    case "workspace-created":
      return "Workspace de laboratorio criado com sucesso.";
    case "project-created":
      return "Projeto de experimento criado com sucesso.";
    case "experiment-started":
      return "Experimento iniciado com sucesso.";
    case "experiment-stopped":
      return "Experimento encerrado com sucesso.";
    case "profile-promoted":
      return "Experimento promovido para publication profile.";
    case "cycle-triggered":
      return "Ciclo autonomo disparado com sucesso.";
    default:
      return null;
  }
}

function readExperimentAnalyticsMetric(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const analytics =
    "analytics" in (value as Record<string, unknown>)
      ? (value as Record<string, unknown>).analytics
      : null;

  if (!analytics || typeof analytics !== "object") {
    return 0;
  }

  const metric = (analytics as Record<string, unknown>)[key];
  return typeof metric === "number" ? metric : 0;
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ admin?: string }>;
}) {
  if (!isDatabaseConfigured()) {
    return (
      <main className="page-shell">
        <section className="hero hero-compact">
          <p className="eyebrow">Admin Lab</p>
          <h1>Conecte o banco para ativar a operacao interna.</h1>
        </section>
      </main>
    );
  }

  const appUser = await requirePlatformAdmin().catch(() => redirect("/dashboard"));
  const workspaces = await listAdminLabWorkspacesForUser(appUser.id);
  const profileRankings = await listPublicationProfileRankingsForAdmin();
  const query = await searchParams;
  const runningExperiments = workspaces
    .flatMap((workspace) => workspace.projects)
    .flatMap((project) => project.experimentRuns)
    .filter((run) => run.status === "RUNNING");
  const flashMessage = readAdminFlashMessage(query.admin);

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <p className="eyebrow">Admin Lab</p>
        <h1>Operacao interna de experimentos e perfis vencedores.</h1>
        <p className="lede">
          Esta area existe para rodar testes autonomos em contas novas,
          capturar padroes vencedores e transformar isso em publication profiles.
        </p>
        <div className="actions">
          <Link className="button button-secondary" href="/dashboard">
            Voltar ao dashboard
          </Link>
        </div>
      </section>

      {flashMessage ? (
        <section className="flash-banner">
          <p>{flashMessage}</p>
        </section>
      ) : null}

      <section className="grid">
        <article className="card">
          <h2>Admin</h2>
          <p>{appUser.email}</p>
        </article>
        <article className="card">
          <h2>Labs</h2>
          <p>{workspaces.length}</p>
        </article>
        <article className="card">
          <h2>Projetos de experimento</h2>
          <p>{workspaces.flatMap((workspace) => workspace.projects).length}</p>
        </article>
        <article className="card">
          <h2>Experimentos rodando</h2>
          <p>{runningExperiments.length}</p>
        </article>
        <article className="card">
          <h2>Profiles ativos</h2>
          <p>{profileRankings.filter((profile) => profile.status === "ACTIVE").length}</p>
        </article>
      </section>

      <section className="card action-panel">
        <div>
          <p className="section-label">Bootstrap</p>
          <h2>Criar workspace de laboratorio</h2>
          <p className="muted">
            Use um workspace do tipo `ADMIN_LAB` para isolar contas de teste e
            projetos que podem usar `AUTO_APPROVE`.
          </p>
        </div>

        <form action={createAdminLabWorkspaceAction} className="inline-form">
          <input
            className="input"
            type="text"
            name="name"
            placeholder="Growth Lab Alpha"
            required
          />
          <button className="button button-primary" type="submit">
            Criar admin lab
          </button>
        </form>
      </section>

      <section className="stack">
        {workspaces.length === 0 ? (
          <article className="card">
            <h2>Nenhum admin lab criado ainda.</h2>
            <p>
              Crie o primeiro workspace de laboratorio para comecar a rodar
              experimentos autonomos.
            </p>
          </article>
        ) : (
          workspaces.map((workspace) => (
            <article className="card" key={workspace.id}>
              <div className="card-header">
                <div>
                  <p className="section-label">Admin Lab</p>
                  <h2>{workspace.name}</h2>
                  <p className="muted">
                    tipo {workspace.type} - papel {workspace.members[0]?.role ?? "OWNER"}
                  </p>
                </div>
                <span className="pill">{workspace.projects.length} projetos</span>
              </div>

              <div className="stack-sm">
                <form
                  action={createExperimentProjectAction.bind(null, workspace.id)}
                  className="inline-form"
                >
                  <input
                    className="input"
                    type="text"
                    name="name"
                    placeholder="Conta teste creator UGC"
                    required
                  />
                  <input
                    className="input"
                    type="text"
                    name="niche"
                    placeholder="Creator economy"
                    required
                  />
                  <input
                    className="input"
                    type="text"
                    name="timezone"
                    defaultValue="America/Sao_Paulo"
                    required
                  />
                  <button className="button button-secondary" type="submit">
                    Criar experimento
                  </button>
                </form>

                {workspace.projects.length === 0 ? (
                  <p className="muted">Nenhum projeto de experimento neste lab.</p>
                ) : (
                  workspace.projects.map((project) => {
                    const latestRun = project.experimentRuns[0];
                    const running = latestRun?.status === "RUNNING";
                    const runViews = readExperimentAnalyticsMetric(
                      latestRun?.resultMetrics,
                      "views",
                    );
                    const runFollowers = readExperimentAnalyticsMetric(
                      latestRun?.resultMetrics,
                      "followers",
                    );

                    return (
                      <div className="subcard subcard-block" key={project.id}>
                        <div>
                          <h3>{project.name}</h3>
                          <p className="muted">
                            {project.niche} - modo {project.mode} - aprovacao {project.approvalMode}
                          </p>
                          <p className="muted">
                            ultimo experimento {latestRun?.status ?? "nao iniciado"}
                            {latestRun?.startedAt
                              ? ` - ${new Date(latestRun.startedAt).toLocaleString("pt-BR")}`
                              : ""}
                          </p>
                          {latestRun ? (
                            <p className="muted">
                              views {runViews.toLocaleString("pt-BR")} - followers {runFollowers.toLocaleString("pt-BR")}
                            </p>
                          ) : null}
                        </div>

                        <div className="stack-sm">
                          <div className="actions">
                            <Link
                              className="button button-secondary"
                              href={`/dashboard/projects/${project.id}`}
                            >
                              Abrir projeto
                            </Link>
                          </div>

                          {!running ? (
                            <>
                              <form
                                action={startExperimentRunAction.bind(null, project.id)}
                                className="inline-form"
                              >
                                <input
                                  className="input"
                                  type="text"
                                  name="hypothesis"
                                  placeholder="Hooks curtos superam scripts longos"
                                />
                                <input
                                  className="input"
                                  type="text"
                                  name="objective"
                                  placeholder="Descobrir cadencia e formato vencedor"
                                />
                                <button className="button button-primary" type="submit">
                                  Iniciar experimento
                                </button>
                              </form>

                              {latestRun &&
                              ["STOPPED", "COMPLETED", "PROMOTED"].includes(latestRun.status) ? (
                                <form
                                  action={promoteExperimentToProfileAction.bind(null, latestRun.id)}
                                  className="inline-form"
                                >
                                  <input
                                    className="input"
                                    type="text"
                                    name="name"
                                    placeholder="Nome do publication profile"
                                    required
                                  />
                                  <input
                                    className="input"
                                    type="text"
                                    name="description"
                                    placeholder="Descricao curta do padrao vencedor"
                                  />
                                  <button className="button button-secondary" type="submit">
                                    Promover para profile
                                  </button>
                                </form>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <div className="actions">
                                <form action={runAutonomousCycleAction.bind(null, project.id)}>
                                  <button className="button button-primary" type="submit">
                                    Rodar ciclo agora
                                  </button>
                                </form>
                              </div>
                              <form
                                action={stopExperimentRunAction.bind(null, project.id)}
                                className="inline-form"
                              >
                                <input
                                  className="input"
                                  type="text"
                                  name="summary"
                                  placeholder="Resumo curto do teste encerrado"
                                />
                                <button className="button button-secondary" type="submit">
                                  Encerrar experimento
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="stack">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="section-label">Publication Profiles</p>
              <h2>Catalogo interno e ranking operacional</h2>
            </div>
            <span className="pill">{profileRankings.length} itens</span>
          </div>

          <div className="stack-sm">
            {profileRankings.length === 0 ? (
              <p className="muted">Nenhum publication profile promovido ainda.</p>
            ) : (
              profileRankings.map((profile, index) => (
                <div className="subcard" key={profile.profileId}>
                  <div>
                    <h3>
                      #{index + 1} {profile.name}
                    </h3>
                    <p className="muted">
                      score {profile.score}/100 ({profile.scoreLabel}) - {profile.status} - slug {profile.slug}
                    </p>
                    <p className="muted">
                      origem {profile.sourceProjectName ?? "manual"} - atribuicoes {profile.assignedProjectsCount}
                    </p>
                    <p className="muted">
                      readiness {profile.readinessScore} - experimento {profile.experimentScore} - adocao {profile.adoptionScore} - recencia {profile.recencyScore}
                    </p>
                    {profile.keySignals.length ? (
                      <ul className="plain-list">
                        {profile.keySignals.map((signal) => (
                          <li key={signal}>{signal}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
