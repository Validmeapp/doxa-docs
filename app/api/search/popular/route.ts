import { NextRequest, NextResponse } from 'next/server';
import { searchAnalytics } from '@/lib/search-analytics';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || undefined;
    const version = searchParams.get('version') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10');

    const popularSearches = await searchAnalytics.getPopularSearches(locale, version, limit);

    return NextResponse.json(popularSearches);
  } catch (error) {
    console.error('Popular searches API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular searches' },
      { status: 500 }
    );
  }
}