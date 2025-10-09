import { NextRequest, NextResponse } from 'next/server';
import { LeadData } from '@/lib/bigquery';
import { getCachedData, setCachedData } from '@/lib/redis';

const FULL_CACHE_KEY = 'bigquery_leads_full_cache';

/**
 * Query all data from BigQuery and cache it
 */
async function fetchAndCacheFromBigQuery() {
  const { BigQuery } = await import('@google-cloud/bigquery');
  const fs = await import('fs');
  const path = await import('path');
  
  console.log('📥 Cache miss - fetching ALL data from BigQuery...');
  
  const credentialsPath = path.join(process.cwd(), 'bigquery-credentials.json');
  const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
  const credentials = JSON.parse(credentialsContent);

  const bigquery = new BigQuery({
    projectId: 'oceanic-sky-474609-v5',
    credentials,
  });

  const query = `
    SELECT *
    FROM \`oceanic-sky-474609-v5.lead_generation.struxure_leads\`
    ORDER BY Timestamp DESC
  `;

  const [rows] = await bigquery.query(query);
  console.log(`✅ Fetched ${rows.length.toLocaleString()} rows from BigQuery`);

  // Cache for 24 hours
  await setCachedData(FULL_CACHE_KEY, rows, 60 * 60 * 24);
  
  return rows as LeadData[];
}

/**
 * Get all data (from Redis or BigQuery)
 */
async function getAllData(): Promise<LeadData[]> {
  // Try Redis first
  try {
    const cached = await getCachedData(FULL_CACHE_KEY);
    if (cached && Array.isArray(cached)) {
      console.log(`✅ Using cached data from Redis (${cached.length.toLocaleString()} rows)`);
      return cached as LeadData[];
    }
  } catch (cacheError) {
    console.warn('⚠️ Redis read error, falling back to BigQuery:', cacheError);
  }

  // Fallback to BigQuery
  return await fetchAndCacheFromBigQuery();
}

/**
 * GET /api/bigquery-data
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 25, max: 500)
 * - nocache: Skip cache (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '25', 10)), 500);
    const noCache = searchParams.get('nocache') === 'true';

    console.log('📥 BigQuery API Request:', { page, limit, noCache });

    // Get all data (from Redis cache or BigQuery)
    let allData: LeadData[];
    
    if (noCache) {
      // Force refresh from BigQuery
      console.log('🔄 nocache=true, forcing BigQuery fetch...');
      allData = await fetchAndCacheFromBigQuery();
    } else {
      // Try cache first, fallback to BigQuery
      allData = await getAllData();
    }

    // Calculate pagination
    const totalCount = allData.length;
    const offset = (page - 1) * limit;
    const paginatedData = allData.slice(offset, offset + limit);

    console.log(`✅ Returning ${paginatedData.length} rows (page ${page} of ${Math.ceil(totalCount / limit)})`);

    return NextResponse.json({
      success: true,
      data: paginatedData,
      totalCount,
      page,
      limit,
      cached: !noCache,
    });

  } catch (error) {
    console.error('❌ BigQuery API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch data'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bigquery-data
 * 
 * Manually refresh the cache from BigQuery
 */
export async function POST() {
  try {
    console.log('🔄 Manual cache refresh requested...');
    const data = await fetchAndCacheFromBigQuery();
    
    return NextResponse.json({
      success: true,
      message: 'Cache refreshed from BigQuery',
      count: data.length,
    });
  } catch (error) {
    console.error('❌ Cache refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

