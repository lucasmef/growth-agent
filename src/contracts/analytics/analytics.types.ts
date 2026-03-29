export type NormalizedAnalyticsMetrics = {
  impressions?: number;
  views?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  profileVisits?: number;
  followersGained?: number;
  watchTimeSeconds?: number;
  averageWatchTimeSeconds?: number;
  completionRate?: number;
  ctr?: number;
  engagementRate?: number;
};

export type OptimizationInsight = {
  title: string;
  rationale: string;
  confidence: number;
  actionType:
    | "DOUBLE_DOWN"
    | "REDUCE"
    | "TRY_NEW_HOOK"
    | "TRY_NEW_FORMAT"
    | "ADJUST_CTA"
    | "ADJUST_POSTING_TIME";
};
