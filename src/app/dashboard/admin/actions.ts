"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { promoteExperimentToProfileInputSchema } from "@/modules/profiles/application/profile.schemas";
import { promoteExperimentRunToProfile } from "@/modules/profiles/application/profile.service";
import { requirePlatformAdmin } from "@/modules/identity/application/require-app-user";
import {
  createAdminLabWorkspaceInputSchema,
  createExperimentProjectInputSchema,
  startExperimentRunInputSchema,
  stopExperimentRunInputSchema,
} from "@/modules/admin-lab/application/admin-lab.schemas";
import {
  createAdminLabWorkspaceForUser,
  createExperimentProjectForWorkspace,
  startExperimentRunForProject,
  stopExperimentRunForProject,
} from "@/modules/admin-lab/application/admin-lab.service";

export async function createAdminLabWorkspaceAction(formData: FormData) {
  const appUser = await requirePlatformAdmin();
  const input = createAdminLabWorkspaceInputSchema.parse({
    name: formData.get("name"),
  });

  await createAdminLabWorkspaceForUser(appUser.id, input);

  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin?admin=workspace-created");
}

export async function createExperimentProjectAction(
  workspaceId: string,
  formData: FormData,
) {
  const appUser = await requirePlatformAdmin();
  const input = createExperimentProjectInputSchema.parse({
    name: formData.get("name"),
    niche: formData.get("niche"),
    timezone: formData.get("timezone") || "America/Sao_Paulo",
  });

  await createExperimentProjectForWorkspace(appUser.id, workspaceId, input);

  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin?admin=project-created");
}

export async function startExperimentRunAction(
  projectId: string,
  formData: FormData,
) {
  const appUser = await requirePlatformAdmin();
  const input = startExperimentRunInputSchema.parse({
    hypothesis: String(formData.get("hypothesis") ?? "").trim() || undefined,
    objective: String(formData.get("objective") ?? "").trim() || undefined,
  });

  await startExperimentRunForProject(appUser.id, projectId, input);

  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect("/dashboard/admin?admin=experiment-started");
}

export async function stopExperimentRunAction(
  projectId: string,
  formData: FormData,
) {
  const appUser = await requirePlatformAdmin();
  const input = stopExperimentRunInputSchema.parse({
    summary: String(formData.get("summary") ?? "").trim() || undefined,
  });

  await stopExperimentRunForProject(appUser.id, projectId, input);

  revalidatePath("/dashboard/admin");
  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect("/dashboard/admin?admin=experiment-stopped");
}

export async function promoteExperimentToProfileAction(
  experimentRunId: string,
  formData: FormData,
) {
  const appUser = await requirePlatformAdmin();
  const input = promoteExperimentToProfileInputSchema.parse({
    name: formData.get("name"),
    description: String(formData.get("description") ?? "").trim() || undefined,
  });

  await promoteExperimentRunToProfile(appUser.id, experimentRunId, input);

  revalidatePath("/dashboard/admin");
  redirect("/dashboard/admin?admin=profile-promoted");
}
