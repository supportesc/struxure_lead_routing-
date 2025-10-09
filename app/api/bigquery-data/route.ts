import { NextRequest, NextResponse } from 'next/server';
import { queryLeads, QueryFilters, PaginationOptions } from '@/lib/bigquery';
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

  // Array filters (support multiple values)
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

  // Single value filters
  const struxureDealer = searchParams.get('struxureDealer');
  if (struxureDealer) filters.struxureDealer = struxureDealer;

  const deepwaterDealer = searchParams.get('deepwaterDealer');
  if (deepwaterDealer) filters.deepwaterDealer = deepwaterDealer;

  return filters;
}

/**
 * Parse pagination parameters
 */
function parsePagination(searchParams: URLSearchParams): PaginationOptions {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '25', 10);

  return {
    page: Math.max(1, page),
    limit: Math.min(Math.max(1, limit), 500), // Cap at 500 items per page
  };
}

/**
 * Generate cache key based on query parameters
 */
function generateCacheKey(filters: QueryFilters, pagination: PaginationOptions): string {
  const data = JSON.stringify({ filters, pagination });
  const hash = crypto.createHash('md5').update(data).digest('hex');
  return `bq:leads:${hash}`;
}

/**
 * GET /api/bigquery-data
 * 
 * Query parameters:
 * - dateFrom: Start date (YYYY-MM-DD)
 * - dateTo: End date (YYYY-MM-DD)
 * - routeTo: Route To filter (can be multiple)
 * - projectType: Project Type filter (can be multiple)
 * - utmSource: UTM Source filter (can be multiple)
 * - campaign: Campaign filter (can be multiple)
 * - state: State filter (can be multiple)
 * - struxureDealer: Struxure Dealer filter
 * - deepwaterDealer: Deepwater Dealer filter
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 25, max: 500)
 * - nocache: Skip cache (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = parseFilters(searchParams);
    const pagination = parsePagination(searchParams);
    const noCache = searchParams.get('nocache') === 'true';

    console.log('📥 BigQuery API Request:', { filters, pagination, noCache });

    // Generate cache key
    const cacheKey = generateCacheKey(filters, pagination);

    // Check cache first (unless nocache is specified)
    if (!noCache) {
      try {
        const cached = await getCachedData(cacheKey);
        if (cached) {
          console.log('✅ Returning cached BigQuery data');
          return NextResponse.json({
            success: true,
            ...cached,
            cached: true,
          });
        }
      } catch (cacheError) {
        console.warn('⚠️ Cache read error:', cacheError);
        // Continue to fetch from BigQuery
      }
    }

    // Query BigQuery
    const result = await queryLeads(filters, pagination);

    // Cache the result for 15 minutes
    try {
      await setCachedData(cacheKey, result, 60 * 15);
    } catch (cacheError) {
      console.warn('⚠️ Cache write error:', cacheError);
      // Continue even if caching fails
    }

    return NextResponse.json({
      success: true,
      ...result,
      cached: false,
    });

  } catch (error) {
    console.error('❌ BigQuery API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch data from BigQuery'
      },
      { status: 500 }
    );
  }
}

