import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '@/lib/ltk/token-manager';

export async function POST(req: NextRequest) {
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  try {
    const token = await getValidToken(slug);
    return NextResponse.json({ success: true, tokenPreview: token.slice(0, 20) + '...' });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Refresh failed' },
      { status: 500 }
    );
  }
}
