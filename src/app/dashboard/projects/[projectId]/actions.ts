"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppUrl } from "@/lib/env";
import { requireAppUser } from "@/modules/identity/application/require-app-user";
import {
  createProjectBundlePortalLinkForUser,
  ensureProjectBundleTeamForUser,
  refreshProjectBundleStateForUser,
} from "@/modules/project/application/project-bundle.service";

export async function ensureBundleTeamAction(projectId: string) {
  const appUser = await requireAppUser();

  await ensureProjectBundleTeamForUser(appUser.id, projectId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?bundle=team-ready`);
}

export async function openBundlePortalAction(projectId: string) {
  const appUser = await requireAppUser();
  const redirectUrl = `${getAppUrl()}/dashboard/projects/${projectId}?bundle=connected`;
  const result = await createProjectBundlePortalLinkForUser({
    userId: appUser.id,
    projectId,
    redirectUrl,
  });

  redirect(result.url);
}

export async function refreshBundleAccountsAction(projectId: string) {
  const appUser = await requireAppUser();

  await refreshProjectBundleStateForUser(appUser.id, projectId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?bundle=refreshed`);
}
