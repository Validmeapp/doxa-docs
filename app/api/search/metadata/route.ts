import { NextRequest, NextResponse } from 'next/server';
import { searchAnalytics } from '@/lib/search-analytics';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || undefined;
    const version = searchParams.get('version') || undefined;

    const metadata = await searchAnalytics.getSearchMetadata(locale, version);

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Search metadata API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search metadata' },
      { status: 500 }
    );
  }
}