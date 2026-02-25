'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
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
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to load data');
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
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

  const statCards = [
    { label: 'Total Posts (30d)', value: data.posts_count.toString() },
    { label: 'Avg / Week', value: data.avg_posts_per_week.toString() },
    { label: 'Top Retailer', value: data.top_retailer },
    { label: 'Products Linked', value: data.total_products.toLocaleString() },
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold capitalize">{slug}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Content analytics &mdash; {formatDate(data.date_range.start)} to {formatDate(data.date_range.end)}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold truncate">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Posts Per Day Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Posts Published Per Day</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.posts_per_day} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: unknown) => {
                  const d = new Date(String(v));
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                interval={4}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v: unknown) => formatDate(String(v))}
                formatter={(v: unknown) => [String(v), 'Posts']}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Retailers Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Top Retailers by Link Count</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.top_retailers} margin={{ top: 4, right: 16, left: -8, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v: unknown) => [String(v), 'Links']} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Posts Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.recent_posts.map((post) => (
            <a
              key={post.id}
              href={post.share_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                <div className="relative aspect-square bg-muted overflow-hidden">
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
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">{formatDate(post.date_published)}</p>
                  <p className="text-xs leading-snug line-clamp-2">{truncate(post.caption, 100)}</p>
                  <Badge variant="secondary" className="text-xs">
                    {post.product_count} product{post.product_count !== 1 ? 's' : ''}
                  </Badge>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
