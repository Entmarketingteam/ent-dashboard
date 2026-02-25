'use client';

import { Badge } from '@/components/ui/badge';
import type { CreatorTokenRecord } from '@/types';

interface Props {
  status: CreatorTokenRecord['status'];
}

const statusConfig: Record<CreatorTokenRecord['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  expiring: { label: 'Expiring', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },
  needs_reauth: { label: 'Needs Reauth', variant: 'destructive' },
};

export function TokenStatusBadge({ status }: Props) {
  const config = statusConfig[status] ?? statusConfig.error;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
