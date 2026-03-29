const domains = [
  "Strategy",
  "Planning",
  "Content",
  "Approval",
  "Publishing",
  "Analytics",
  "Agent Ops",
];

export default function DashboardPage() {
  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <p className="eyebrow">Dashboard</p>
        <h1>Growth Agent está pronto para a próxima camada de implementação.</h1>
        <p className="lede">
          Esta tela é o ponto de entrada para onboarding, calendário editorial,
          revisão de drafts, publicação e métricas.
        </p>
      </section>

      <section className="grid">
        {domains.map((domain) => (
          <article className="card" key={domain}>
            <h2>{domain}</h2>
            <p>Boundary já previsto na arquitetura e pronto para ganhar rotas, use cases e telas.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
