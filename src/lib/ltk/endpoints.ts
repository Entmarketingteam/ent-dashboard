const GATEWAY = process.env.LTK_API_GATEWAY!;
const CREATOR = process.env.LTK_CREATOR_API!;

export const endpoints = {
  heroChart: (publisherId: string, range: string) =>
    `${GATEWAY}/analytics/hero_chart?range=${range}&publisher_id=${publisherId}`,

  analyticsSummary: (range: string) =>
    `${CREATOR}/analytics/summary?range=${range}`,

  followers: (range: string) =>
    `${CREATOR}/community/followers?range=${range}`,

  earnings: (range: string) =>
    `${CREATOR}/earnings/summary?range=${range}`,

  engagement: (range: string) =>
    `${CREATOR}/engagement/summary?range=${range}`,

  performanceSummary: (publisherId: string, range: string) =>
    `${GATEWAY}/api/creator-analytics/v1/performance_summary?range=${range}&publisher_id=${publisherId}`,

  commissionsSummary: (publisherId: string, range: string) =>
    `${GATEWAY}/api/creator-analytics/v1/commissions_summary?range=${range}&publisher_id=${publisherId}`,

  topProducts: (publisherId: string, range: string, page = 1) =>
    `${GATEWAY}/analytics/top_performers/links?range=${range}&publisher_id=${publisherId}&page=${page}&per_page=10`,

  profile: (profileId: string) =>
    `${GATEWAY}/api/pub/v2/profiles/${profileId}`,
};
