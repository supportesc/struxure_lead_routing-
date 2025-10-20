import { NextRequest, NextResponse } from 'next/server';
import { getStats, QueryFilters } from '@/lib/bigquery';
import { getCachedData, setCachedData } from '@/lib/redis';
import crypto from 'crypto';

/**
 * Parse query parameters into filters
 */
function parseFilters(searchParams: URLSearchParams): QueryFilters {
  const filters: QueryFilters = {};

  // Date range
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  // Array filters
  const routeTo = searchParams.getAll('routeTo');
  if (routeTo.length > 0) filters.routeTo = routeTo;

  const projectType = searchParams.getAll('projectType');
  if (projectType.length > 0) filters.projectType = projectType;

  const utmSource = searchParams.getAll('utmSource');
  if (utmSource.length > 0) filters.utmSource = utmSource;

  const campaign = searchParams.getAll('campaign');
  if (campaign.length > 0) filters.campaign = campaign;

  const state = searchParams.getAll('state');
  if (state.length > 0) filters.state = state;

  return filters;
}

/**
 * Generate cache key for stats
 */
function generateCacheKey(filters: QueryFilters): string {
  const data = JSON.stringify(filters);
  const hash = crypto.createHash('md5').update(data).digest('hex');
  return `bq:stats:${hash}`;
}

// Force dynamic rendering - never pre-render this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * GET /api/bigquery-stats
 * 
 * Query parameters:
 * - dateFrom: Start date (YYYY-MM-DD)
 * - dateTo: End date (YYYY-MM-DD)
 * - routeTo: Route To filter (can be multiple)
 * - projectType: Project Type filter (can be multiple)
 * - utmSource: UTM Source filter (can be multiple)
 * - campaign: Campaign filter (can be multiple)
 * - state: State filter (can be multiple)
 * - nocache: Skip cache (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = parseFilters(searchParams);
    const noCache = searchParams.get('nocache') === 'true';

    console.log('📊 Stats API Request:', { filters, noCache, source: noCache ? 'BigQuery (forced)' : 'Redis cache first' });

    // Generate cache key
    const cacheKey = generateCacheKey(filters);

    // Check cache first (unless nocache is specified)
    if (!noCache) {
      try {
        const cached = await getCachedData(cacheKey);
        if (cached) {
          console.log('✅ Returning cached stats from Redis');
          return NextResponse.json({
            success: true,
            ...cached,
            cached: true,
          });
        }
      } catch (cacheError) {
        console.warn('⚠️ Cache read error:', cacheError);
      }
    }

    // Get stats from BigQuery
    const stats = await getStats(filters);

    // Cache the result for 1 hour
    try {
      await setCachedData(cacheKey, stats, 60 * 60);
    } catch (cacheError) {
      console.warn('⚠️ Cache write error:', cacheError);
    }

    return NextResponse.json({
      success: true,
      ...stats,
      cached: false,
    });

  } catch (error) {
    console.error('❌ BigQuery Stats API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        // message: 'Failed to fetch stats from BigQuery'
      },
      { status: 500 }
    );
  }
}