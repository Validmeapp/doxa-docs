import { NextRequest, NextResponse } from 'next/server';
import { searchAnalytics } from '@/lib/search-analytics';

export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || undefined;
    const version = searchParams.get('version') || undefined;
    const days = parseInt(searchParams.get('days') || '30');

    const analytics = await searchAnalytics.getSearchAnalytics(locale, version, days);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Search analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, locale, version, resultsCount, clickedResultPath } = body;

    if (!query || !locale || !version || typeof resultsCount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: query, locale, version, resultsCount' },
        { status: 400 }
      );
    }

    if (clickedResultPath) {
      // Log search result click
      await searchAnalytics.logResultClick({
        query,
        locale,
        version,
        resultsCount,
        clickedResultPath
      });
    } else {
      // Log search query
      await searchAnalytics.logSearch({
        query,
        locale,
        version,
        resultsCount
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Search analytics logging error:', error);
    return NextResponse.json(
      { error: 'Failed to log search analytics' },
      { status: 500 }
    );
  }
}