export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Growth Agent V1</p>
        <h1>Base operacional para um agente de growth com aprovação humana.</h1>
        <p className="lede">
          Scaffold inicial em Next.js, Prisma, Trigger.dev e adapters para IA e
          bundle.social.
        </p>
        <div className="actions">
          <a className="button button-primary" href="/dashboard">
            Abrir dashboard
          </a>
          <a className="button button-secondary" href="/api/health">
            Ver healthcheck
          </a>
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Domínio</h2>
          <p>Workspace, project, strategy, planning, content, approval, publishing e analytics.</p>
        </article>
        <article className="card">
          <h2>Infra</h2>
          <p>Prisma/PostgreSQL como source of truth e Trigger.dev para jobs e retries.</p>
        </article>
        <article className="card">
          <h2>Guardrail central</h2>
          <p>Nenhum conteúdo pode ser agendado ou publicado sem aprovação humana explícita.</p>
        </article>
      </section>
    </main>
  );
}
