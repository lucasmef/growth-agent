import { isDatabaseConfigured } from "@/lib/env";
import { SubmitButton } from "./submit-button";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  if (!isDatabaseConfigured()) {
    return (
      <main className="page-shell">
        <section className="hero">
          <p className="eyebrow">Onboarding</p>
          <h1>Configure `DATABASE_URL` para ativar o onboarding persistido.</h1>
          <p className="lede">
            A interface já está pronta; falta apenas conectar um PostgreSQL para
            gravar workspace, projeto e estratégia.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero hero-compact">
        <p className="eyebrow">Onboarding</p>
        <h1>Crie o primeiro workspace, projeto e estratégia editorial.</h1>
        <p className="lede">
          Este formulário cobre o primeiro slice crítico da V1: contexto do
          case, objetivo e guardrails editoriais.
        </p>
      </section>

      <form className="form-card">
        <section className="form-section">
          <h2>Tenant e projeto</h2>
          <label>
            Workspace name
            <input name="workspaceName" placeholder="Growth Lab" required />
          </label>
          <label>
            Project name
            <input name="projectName" placeholder="Perfil fundador" required />
          </label>
          <label>
            Nicho
            <input name="niche" placeholder="Educação em IA aplicada a negócios" required />
          </label>
          <label>
            Timezone
            <input name="timezone" defaultValue="America/Sao_Paulo" required />
          </label>
        </section>

        <section className="form-section">
          <h2>Estratégia</h2>
          <label>
            Público-alvo
            <textarea
              name="targetAudience"
              placeholder="Fundadores, creators e PMEs que querem crescer com conteúdo."
              required
              rows={4}
            />
          </label>
          <label>
            Tom de voz
            <input name="toneOfVoice" placeholder="Direto, técnico e confiante" required />
          </label>
          <label>
            Objetivo principal
            <input name="primaryGoal" placeholder="Crescer audiência qualificada" required />
          </label>
          <label>
            Objetivos secundários
            <textarea
              name="secondaryGoals"
              placeholder={"Gerar leads\nPosicionar autoridade\nAumentar visitas ao perfil"}
              rows={3}
            />
          </label>
          <label>
            Oferta ou contexto comercial
            <textarea
              name="offerDescription"
              placeholder="Consultoria, curso, comunidade ou produto que o conteúdo deve suportar."
              rows={3}
            />
          </label>
        </section>

        <section className="form-section">
          <h2>Regras editoriais</h2>
          <label>
            Regras editoriais
            <textarea
              name="editorialRules"
              placeholder={"Abrir com hook forte\nEvitar jargão desnecessário\nFechar com CTA claro"}
              rows={4}
            />
          </label>
          <label>
            Tópicos banidos
            <textarea
              name="bannedTopics"
              placeholder={"Promessas de renda rápida\nAtaques pessoais"}
              rows={3}
            />
          </label>
          <label>
            Claims proibidos
            <textarea
              name="bannedClaims"
              placeholder={"Garantia de resultados\nNúmeros sem fonte"}
              rows={3}
            />
          </label>
        </section>

        <SubmitButton />
      </form>
    </main>
  );
}
