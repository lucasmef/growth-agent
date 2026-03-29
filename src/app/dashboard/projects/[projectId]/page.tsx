import Link from "next/link";
import { notFound } from "next/navigation";

import { isDatabaseConfigured } from "@/lib/env";
import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { getProjectForUser } from "@/modules/project/application/project.service";

export const dynamic = "force-dynamic";

function readStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  if (!isDatabaseConfigured()) {
    return notFound();
  }

  const { projectId } = await params;
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
