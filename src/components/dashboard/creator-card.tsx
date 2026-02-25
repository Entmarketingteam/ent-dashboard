'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TokenStatusBadge } from './token-status-badge';
import type { CreatorHealth } from '@/types';

interface Props {
  creator: CreatorHealth;
}

export function CreatorCard({ creator }: Props) {
  return (
    <Link href={`/creator/${creator.slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{creator.creator}</CardTitle>
          <TokenStatusBadge status={creator.status} />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Publisher ID: {creator.publisherId || '—'}
          </p>
          {creator.lastRefreshed && (
            <p className="text-xs text-muted-foreground mt-1">
              Last refresh: {new Date(creator.lastRefreshed).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
