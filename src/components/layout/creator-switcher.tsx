'use client';

import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { CreatorHealth } from '@/types';

interface Props {
  creators: CreatorHealth[];
  currentSlug: string;
}

export function CreatorSwitcher({ creators, currentSlug }: Props) {
  const router = useRouter();
  const current = creators.find((c) => c.slug === currentSlug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {current?.creator ?? currentSlug} ▾
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {creators.map((c) => (
          <DropdownMenuItem key={c.slug} onClick={() => router.push(`/creator/${c.slug}`)}>
            {c.creator}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
