import { NextResponse } from 'next/server';
import { generateAllSitemaps } from '@/lib/sitemap-generator';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const { sitemapIndex } = await generateAllSitemaps();
    
    return new NextResponse(sitemapIndex, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}