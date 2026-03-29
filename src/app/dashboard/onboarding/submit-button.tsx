"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { OnboardingFormState } from "./actions";
import { submitOnboarding } from "./actions";

const initialState: OnboardingFormState = {};

function Button({ formAction }: { formAction: (formData: FormData) => void }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="button button-primary"
      type="submit"
      formAction={formAction}
      disabled={pending}
    >
      {pending ? "Salvando..." : "Concluir onboarding"}
    </button>
  );
}

export function SubmitButton() {
  const [state, formAction] = useActionState(submitOnboarding, initialState);

  return (
    <div className="form-footer">
      {state.error ? <p className="error-text">{state.error}</p> : null}
      <Button formAction={formAction} />
    </div>
  );
}
