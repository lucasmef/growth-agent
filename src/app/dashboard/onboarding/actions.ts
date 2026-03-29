"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { splitListInput } from "@/lib/text";
import { requireAppUser } from "@/modules/identity/application/require-app-user";
import { completeInitialOnboarding } from "@/modules/onboarding/application/onboarding.service";
import {
  createProjectInputSchema,
} from "@/modules/project/application/project.schemas";
import {
  upsertStrategyInputSchema,
} from "@/modules/strategy/application/strategy.schemas";
import {
  createWorkspaceInputSchema,
} from "@/modules/workspace/application/workspace.schemas";

export type OnboardingFormState = {
  error?: string;
};

export async function submitOnboarding(
  _prevState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  try {
    const appUser = await requireAppUser();

    const workspace = createWorkspaceInputSchema.parse({
      name: formData.get("workspaceName"),
    });

    const project = createProjectInputSchema.parse({
      name: formData.get("projectName"),
      niche: formData.get("niche"),
      timezone: formData.get("timezone") || "America/Sao_Paulo",
    });

    const strategy = upsertStrategyInputSchema.parse({
      targetAudience: formData.get("targetAudience"),
      toneOfVoice: formData.get("toneOfVoice"),
      primaryGoal: formData.get("primaryGoal"),
      secondaryGoals: splitListInput(String(formData.get("secondaryGoals") ?? "")),
      offerDescription: formData.get("offerDescription"),
      editorialRules: splitListInput(String(formData.get("editorialRules") ?? "")),
      bannedTopics: splitListInput(String(formData.get("bannedTopics") ?? "")),
      bannedClaims: splitListInput(String(formData.get("bannedClaims") ?? "")),
    });

    const result = await completeInitialOnboarding(appUser.id, {
      workspace,
      project,
      strategy,
    });

    revalidatePath("/dashboard");
    redirect(`/dashboard/projects/${result.projectId}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível concluir o onboarding.";

    return {
      error: message,
    };
  }
}
