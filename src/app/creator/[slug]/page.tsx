import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCreatorBySlug, getAllCreators } from '@/lib/airtable/tokens';
import { CreatorSwitcher } from '@/components/layout/creator-switcher';
import { TokenStatusBadge } from '@/components/dashboard/token-status-badge';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { EngagementChart } from '@/components/dashboard/engagement-chart';
import { TopProductsTable } from '@/components/dashboard/top-products-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  params: Promise<{ slug: string }>;
}

async function CreatorData({ slug }: { slug: string }) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const [overviewRes, heroChartRes, topProductsRes] = await Promise.allSettled([
    fetch(`${baseUrl}/api/ltk/${slug}/overview?range=last_30_days`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/ltk/${slug}/hero-chart?range=last_30_days`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/ltk/${slug}/top-products?range=last_30_days&page=1`, { cache: 'no-store' }),
  ]);

  const overview = overviewRes.status === 'fulfilled' && overviewRes.value.ok
    ? await overviewRes.value.json()
    : null;
  const heroChart = heroChartRes.status === 'fulfilled' && heroChartRes.value.ok
    ? await heroChartRes.value.json()
    : null;
  const topProducts = topProductsRes.status === 'fulfilled' && topProductsRes.value.ok
    ? await topProductsRes.value.json()
    : null;

  const needsReauth = overview?.error === 'needs_reauth';

  if (needsReauth) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          This creator needs to re-authenticate. Go to <a href="/settings" className="underline">Settings</a> for instructions.
        </AlertDescription>
      </Alert>
    );
  }

  const metrics = [
    { label: 'Commissions', value: overview ? `$${(overview.commissions ?? 0).toFixed(2)}` : '—' },
    { label: 'Product Clicks', value: overview ? (overview.productClicks ?? 0).toLocaleString() : '—' },
    { label: 'Orders', value: overview ? (overview.orders ?? 0).toLocaleString() : '—' },
    { label: 'Total Sales', value: overview ? `$${(overview.totalSales ?? 0).toFixed(2)}` : '—' },
    { label: 'Followers', value: overview ? (overview.followersTotal ?? 0).toLocaleString() : '—' },
    { label: 'Impressions', value: overview ? (overview.impressions ?? 0).toLocaleString() : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="revenue">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader><CardTitle className="text-sm">Revenue & Commission (30 days)</CardTitle></CardHeader>
            <CardContent>
              <RevenueChart data={heroChart?.data ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <Card>
            <CardHeader><CardTitle className="text-sm">Clicks & Orders (30 days)</CardTitle></CardHeader>
            <CardContent>
              <EngagementChart data={heroChart?.data ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Products</CardTitle></CardHeader>
            <CardContent>
              <TopProductsTable products={topProducts?.products ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default async function CreatorPage({ params }: Props) {
  const { slug } = await params;
  const [creator, allCreators] = await Promise.all([
    getCreatorBySlug(slug),
    getAllCreators(),
  ]);

  if (!creator) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{creator.creator}</h1>
            <TokenStatusBadge status={creator.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">Last 30 days performance</p>
        </div>
        <CreatorSwitcher creators={allCreators} currentSlug={slug} />
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <CreatorData slug={slug} />
      </Suspense>
    </div>
  );
}
