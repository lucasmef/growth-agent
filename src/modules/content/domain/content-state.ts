import type { ContentItemStatus } from "@/contracts";

const transitionMap: Record<ContentItemStatus, ContentItemStatus[]> = {
  IDEA: ["PLANNED", "DRAFTING"],
  PLANNED: ["DRAFTING", "CHANGES_REQUESTED"],
  DRAFTING: ["DRAFT_READY", "PUBLISH_FAILED"],
  DRAFT_READY: ["CHANGES_REQUESTED", "APPROVED"],
  CHANGES_REQUESTED: ["DRAFTING", "APPROVED"],
  APPROVED: ["SCHEDULED", "PUBLISHING"],
  SCHEDULED: ["PUBLISHING", "PUBLISH_FAILED"],
  PUBLISHING: ["PUBLISHED", "PUBLISH_FAILED"],
  PUBLISHED: ["ANALYZED"],
  PUBLISH_FAILED: ["DRAFTING"],
  ANALYZED: [],
};

export function canTransitionContent(
  from: ContentItemStatus,
  to: ContentItemStatus,
) {
  return transitionMap[from].includes(to);
}
