export interface LTKRefreshResponse {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

export interface LTKHeroChartPoint {
  date: string;
  clicks?: number;
  orders?: number;
  revenue?: number;
  commission?: number;
  [key: string]: unknown;
}

export interface LTKHeroChartResponse {
  data?: LTKHeroChartPoint[];
  [key: string]: unknown;
}

export interface LTKAnalyticsSummaryResponse {
  post_impressions?: number;
  posts_count?: number;
  [key: string]: unknown;
}

export interface LTKFollowersResponse {
  followers_total?: number;
  net_change?: number;
  [key: string]: unknown;
}

export interface LTKEarningsResponse {
  commissions?: number;
  pending_payment?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface LTKEngagementResponse {
  total_visits?: number;
  product_clicks?: number;
  orders?: number;
  items_sold?: number;
  total_sales?: number;
  returns?: number;
  [key: string]: unknown;
}

export interface LTKTopPerformerLink {
  title?: string;
  url?: string;
  clicks?: number;
  orders?: number;
  revenue?: number;
  image_url?: string;
  [key: string]: unknown;
}

export interface LTKTopProductsResponse {
  data?: LTKTopPerformerLink[];
  [key: string]: unknown;
}
