import Link from "next/link";

import { isDatabaseConfigured } from "@/lib/env";
import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { listUserWorkspaces } from "@/modules/workspace/application/workspace.service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isDatabaseConfigured()) {
    return (
      <main className="page-shell">
        <section className="hero hero-compact">
          <p className="eyebrow">Configuracao</p>
          <h1>Falta conectar o banco para ativar o fluxo real da V1.</h1>
          <p className="lede">
            Defina `DATABASE_URL` no ambiente para habilitar criacao de
            workspaces, projetos e onboarding estrategico persistido.
          </p>
        </section>
      </main>
    );
  }

  const appUser = await requireAppUser();
  const workspaces = await listUserWorkspaces(appUser.id);
  const projects = workspaces.flatMap((workspace) => workspace.projects);

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <p className="eyebrow">Dashboard</p>
        <h1>Operacao inicial do Growth Agent.</h1>
        <p className="lede">
          O produto agora cobre o fluxo cliente e a fundacao do admin lab para
          experimentos autonomos controlados.
        </p>
        <div className="actions">
          <Link className="button button-primary" href="/dashboard/onboarding">
            Criar workspace e projeto
          </Link>
          {appUser.platformRole === "ADMIN" ? (
            <Link className="button button-secondary" href="/dashboard/admin">
              Abrir admin lab
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Usuario</h2>
          <p>{appUser.email}</p>
        </article>
        <article className="card">
          <h2>Platform role</h2>
          <p>{appUser.platformRole}</p>
        </article>
        <article className="card">
          <h2>Workspaces</h2>
          <p>{workspaces.length}</p>
        </article>
        <article className="card">
          <h2>Projetos</h2>
          <p>{projects.length}</p>
        </article>
      </section>

      {workspaces.length === 0 ? (
        <section className="empty-state">
          <h2>Nenhum workspace ainda.</h2>
          <p>
            Comece pelo onboarding para criar o primeiro case e salvar a base
            estrategica do agente.
          </p>
        </section>
      ) : (
        <section className="stack">
          {workspaces.map((workspace) => (
            <article className="card" key={workspace.id}>
              <div className="card-header">
                <div>
                  <p className="section-label">Workspace</p>
                  <h2>{workspace.name}</h2>
                  <p className="muted">tipo {workspace.type}</p>
                </div>
                <span className="pill">{workspace.members[0]?.role ?? "MEMBER"}</span>
              </div>

              <div className="stack-sm">
                {workspace.projects.length === 0 ? (
                  <p className="muted">Nenhum projeto neste workspace.</p>
                ) : (
                  workspace.projects.map((project) => (
                    <Link
                      className="subcard"
                      href={`/dashboard/projects/${project.id}`}
                      key={project.id}
                    >
                      <div>
                        <h3>{project.name}</h3>
                        <p className="muted">
                          {project.niche} · {project.mode} · {project.approvalMode}
                        </p>
                        <p className="muted">
                          {project.strategy ? "estrategia configurada" : "sem estrategia"}
                        </p>
                      </div>
                      <span className="arrow">→</span>
                    </Link>
                  ))
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
