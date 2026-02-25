export interface CreatorTokenRecord {
  id: string;
  creator: string;
  slug: string;
  publisherId: string;
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  lastRefreshed?: string;
  status: 'active' | 'expiring' | 'error' | 'needs_reauth';
}

export interface HeroChartDataPoint {
  date: string;
  clicks: number;
  orders: number;
  revenue: number;
  commission: number;
}

export interface OverviewMetrics {
  impressions: number;
  postsCount: number;
  followersTotal: number;
  followersNetChange: number;
  commissions: number;
  pendingPayment: number;
  currency: string;
  totalVisits: number;
  productClicks: number;
  orders: number;
  itemsSold: number;
  totalSales: number;
  returns: number;
}

export interface TopProduct {
  rank: number;
  title: string;
  url: string;
  clicks: number;
  orders: number;
  revenue: number;
  image?: string;
}

export interface CreatorHealth {
  slug: string;
  creator: string;
  status: CreatorTokenRecord['status'];
  lastRefreshed?: string;
  publisherId: string;
}

export interface LTKConnectPayload {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}
