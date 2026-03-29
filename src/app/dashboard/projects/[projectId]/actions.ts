"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppUrl } from "@/lib/env";
import {
  approveContentForUser,
  generateDraftForCalendarSlot,
  requestContentChangesForUser,
} from "@/modules/content/application/content.service";
import { requireAppUser } from "@/modules/identity/application/require-app-user";
import {
  createProjectBundlePortalLinkForUser,
  ensureProjectBundleTeamForUser,
  refreshProjectBundleStateForUser,
} from "@/modules/project/application/project-bundle.service";
import {
  generatePillarsForProject,
  generateWeeklyCalendarForProject,
} from "@/modules/planning/application/planning.service";
import {
  attachBundleUploadToContent,
  publishApprovedContentNowForUser,
  scheduleApprovedContentForUser,
  syncLatestPublicationForUser,
} from "@/modules/publishing/application/publishing.service";

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

export async function generatePillarsAction(projectId: string) {
  const appUser = await requireAppUser();

  await generatePillarsForProject(appUser.id, projectId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?planning=pillars-generated`);
}

export async function generateWeeklyCalendarAction(projectId: string) {
  const appUser = await requireAppUser();

  await generateWeeklyCalendarForProject(appUser.id, projectId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?planning=calendar-generated`);
}

export async function generateDraftForSlotAction(projectId: string, slotId: string) {
  const appUser = await requireAppUser();

  await generateDraftForCalendarSlot(appUser.id, projectId, slotId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?content=draft-generated`);
}

export async function approveContentAction(projectId: string, contentItemId: string) {
  const appUser = await requireAppUser();

  await approveContentForUser(appUser.id, contentItemId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?content=approved`);
}

export async function requestChangesAction(projectId: string, contentItemId: string) {
  const appUser = await requireAppUser();

  await requestContentChangesForUser(appUser.id, contentItemId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?content=changes-requested`);
}

export async function attachBundleAssetAction(
  projectId: string,
  contentItemId: string,
  formData: FormData,
) {
  const appUser = await requireAppUser();
  const bundleUploadId = String(formData.get("bundleUploadId") ?? "").trim();
  const assetType = String(formData.get("assetType") ?? "VIDEO").trim();

  if (!bundleUploadId) {
    throw new Error("bundleUploadId is required");
  }

  if (assetType !== "IMAGE" && assetType !== "VIDEO") {
    throw new Error("assetType must be IMAGE or VIDEO");
  }

  await attachBundleUploadToContent({
    userId: appUser.id,
    contentItemId,
    bundleUploadId,
    assetType,
  });

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?publishing=asset-attached`);
}

export async function scheduleContentAction(projectId: string, contentItemId: string) {
  const appUser = await requireAppUser();

  await scheduleApprovedContentForUser(appUser.id, contentItemId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?publishing=scheduled`);
}

export async function publishNowAction(projectId: string, contentItemId: string) {
  const appUser = await requireAppUser();

  await publishApprovedContentNowForUser(appUser.id, contentItemId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?publishing=published-now`);
}

export async function syncPublicationAction(projectId: string, contentItemId: string) {
  const appUser = await requireAppUser();

  await syncLatestPublicationForUser(appUser.id, contentItemId);

  revalidatePath(`/dashboard/projects/${projectId}`);
  redirect(`/dashboard/projects/${projectId}?publishing=synced`);
}
