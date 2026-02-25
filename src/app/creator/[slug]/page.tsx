'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PostsPerDay {
  date: string;
  count: number;
}

interface TopRetailer {
  name: string;
  count: number;
}

interface RecentPost {
  id: string;
  share_url: string;
  hero_image: string;
  caption: string;
  date_published: string;
  product_count: number;
}

interface DashboardData {
  posts_count: number;
  avg_posts_per_week: number;
  top_retailer: string;
  total_products: number;
  posts_per_day: PostsPerDay[];
  top_retailers: TopRetailer[];
  recent_posts: RecentPost[];
  date_range: { start: string; end: string };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-foreground/10" />
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
          {label}
        </p>
        <p className="text-3xl font-bold tracking-tight leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomAreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{formatDate(String(label))}</p>
      <p className="text-muted-foreground">
        {payload[0].value} post{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium">{payload[0].payload.name}</p>
      <p className="text-muted-foreground">{payload[0].value} links</p>
    </div>
  );
}

export default function CreatorPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/ltk/${slug}/data`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<DashboardData>;
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load data');
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-60 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">
              {error === 'needs_reauth'
                ? 'This creator needs to re-authenticate. Go to Settings for instructions.'
                : `Error loading data: ${error}`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  // Trim leading zero-days for cleaner chart
  const chartData = (() => {
    let start = 0;
    for (let i = 0; i < data.posts_per_day.length; i++) {
      if (data.posts_per_day[i].count > 0) { start = i; break; }
    }
    return data.posts_per_day.slice(start);
  })();

  const maxRetailerCount = data.top_retailers[0]?.count ?? 1;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold capitalize tracking-tight">{slug}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatDate(data.date_range.start)} – {formatDate(data.date_range.end)}
          </p>
        </div>
        <Badge variant="secondary" className="text-xs font-medium">
          Last 30 days
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Posts" value={data.posts_count.toString()} sub="published" />
        <StatCard label="Avg / Week" value={data.avg_posts_per_week.toString()} sub="over 30 days" />
        <StatCard label="Top Retailer" value={data.top_retailer} />
        <StatCard label="Products Linked" value={data.total_products.toLocaleString()} sub="across all posts" />
      </div>

      {/* Posts Per Day — Area Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Posting Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: unknown) => {
                  const d = new Date(String(v));
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomAreaTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                fill="url(#activityGrad)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--foreground))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two-column: Retailers + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Top Retailers — Horizontal bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Top Retailers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.top_retailers.map((r, i) => (
              <div key={r.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[200px]">{r.name}</span>
                  <span className="text-muted-foreground tabular-nums ml-2">{r.count}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{
                      width: `${(r.count / maxRetailerCount) * 100}%`,
                      opacity: 1 - i * 0.1,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Content Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Avg products / post</p>
                <p className="text-2xl font-bold">
                  {data.posts_count > 0 ? (data.total_products / data.posts_count).toFixed(1) : '—'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Retailers used</p>
                <p className="text-2xl font-bold">{data.top_retailers.length}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Peak day</p>
                <p className="text-2xl font-bold">
                  {Math.max(...data.posts_per_day.map((d) => d.count))}
                  <span className="text-sm font-normal text-muted-foreground ml-1">posts</span>
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Active days</p>
                <p className="text-2xl font-bold">
                  {data.posts_per_day.filter((d) => d.count > 0).length}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ 30</span>
                </p>
              </div>
            </div>

            {/* Retailer distribution mini bar chart */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Link distribution</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={data.top_retailers} margin={{ top: 0, right: 0, left: -32, bottom: 0 }}>
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {data.top_retailers.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--foreground))" fillOpacity={1 - i * 0.12} />
                    ))}
                  </Bar>
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Posts Grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Recent Posts
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {data.recent_posts.map((post) => (
            <a
              key={post.id}
              href={post.share_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted ring-1 ring-border">
                {post.hero_image ? (
                  <Image
                    src={post.hero_image}
                    alt={truncate(post.caption, 60)}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-end p-2 opacity-0 group-hover:opacity-100">
                  <span className="text-white text-xs font-medium leading-tight line-clamp-2">
                    {truncate(post.caption, 60)}
                  </span>
                </div>
              </div>
              <div className="mt-1.5 px-0.5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{formatDate(post.date_published)}</p>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {post.product_count}p
                </Badge>
              </div>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
