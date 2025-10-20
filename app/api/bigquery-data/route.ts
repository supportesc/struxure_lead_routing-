import { NextRequest, NextResponse } from 'next/server';
import { LeadData } from '@/lib/bigquery';
import { getCachedData, setCachedData } from '@/lib/redis';
import { normalizeLeadTimestamps, analyzeTimestampFormats } from '@/lib/timestamp-normalizer';

const FULL_CACHE_KEY = 'bigquery_leads_full_cache';

// Force dynamic rendering - never pre-render this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * Query all data from BigQuery and cache it
 * ⚠️ THIS FUNCTION CALLS BIGQUERY - Only call when cache refresh is needed
 */
async function fetchAndCacheFromBigQuery() {
  const { BigQuery } = await import('@google-cloud/bigquery');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 [BIGQUERY] CALLING BIGQUERY API - Fetching ALL data...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Use environment variables for production
  if (!process.env.BIGQUERY_PROJECT_ID || !process.env.BIGQUERY_PRIVATE_KEY) {
    throw new Error('BigQuery environment variables not configured');
  }
  
  const credentials = {
    type: 'service_account',
    project_id: process.env.BIGQUERY_PROJECT_ID,
    private_key_id: process.env.BIGQUERY_PRIVATE_KEY_ID,
    private_key: process.env.BIGQUERY_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.BIGQUERY_CLIENT_EMAIL,
    client_id: process.env.BIGQUERY_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.BIGQUERY_CLIENT_EMAIL || '')}`,
    universe_domain: 'googleapis.com'
  };

  const bigquery = new BigQuery({
    projectId: process.env.BIGQUERY_PROJECT_ID,
    credentials,
  });

  const query = `
    SELECT *
    FROM \`${process.env.BIGQUERY_PROJECT_ID}.lead_generation.struxure_leads\`
  `;

  console.log('📡 [BIGQUERY] Executing SQL query...');
  const queryStartTime = Date.now();
  const [rows] = await bigquery.query(query);
  const queryTime = Date.now() - queryStartTime;
  console.log(`✅ [BIGQUERY] Fetched ${rows.length.toLocaleString()} rows from BigQuery in ${queryTime}ms`);

  // Analyze timestamp formats before normalization
  const formatAnalysis = analyzeTimestampFormats(rows);
  console.log('📊 Timestamp Format Analysis:', formatAnalysis.formats);
  
  if (formatAnalysis.inconsistent.length > 0) {
    console.warn('⚠️ Found inconsistent timestamp formats:', formatAnalysis.inconsistent.slice(0, 3));
  }

  // Normalize all timestamps to consistent format
  const normalizedRows = normalizeLeadTimestamps(rows);
  console.log('✅ Timestamps normalized to consistent format');

  // Sort by timestamp DESC (BigQuery sorts strings alphabetically, not chronologically)
  normalizedRows.sort((a: any, b: any) => {
    const dateA = new Date(a.Timestamp);
    const dateB = new Date(b.Timestamp);
    return dateB.getTime() - dateA.getTime(); // DESC order (newest first)
  });
  
  console.log(`✅ Data sorted. Newest: ${normalizedRows[0]?.Timestamp}`);

  // Cache for 24 hours
  await setCachedData(FULL_CACHE_KEY, normalizedRows, 60 * 60 * 24);
  
  return normalizedRows as LeadData[];
}

/**
 * Get all data from Redis cache
 * Returns empty array if Redis is empty (triggers BigQuery fallback)
 */
async function getAllData(): Promise<LeadData[]> {
  console.log('🔍 [REDIS CHECK] Attempting to fetch data from Redis cache...');
  
  try {
    const cached = await getCachedData(FULL_CACHE_KEY);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log(`✅ [REDIS HIT] Successfully retrieved ${cached.length.toLocaleString()} rows from Redis cache`);
      console.log(`📊 [REDIS HIT] NO BigQuery call needed - using cached data`);
      return cached as LeadData[];
    }
    
    // Redis is empty - will trigger BigQuery fallback
    console.warn('⚠️ [REDIS MISS] Redis cache is empty or returned no data');
    console.log('💡 [INFO] Returning empty array - will trigger BigQuery fallback');
    
    return [];
    
  } catch (cacheError) {
    console.error('❌ [REDIS ERROR] Failed to connect to Redis:', cacheError);
    console.warn('⚠️ [WARNING] Redis connection failed - will trigger BigQuery fallback');
    
    // Return empty array - will trigger BigQuery fallback
    return [];
  }
}

/**
 * GET /api/bigquery-data
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 25, max: 500, unlimited if >= 100000)
 * - nocache: Skip cache (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const requestedLimit = parseInt(searchParams.get('limit') || '25', 10);
    const noCache = searchParams.get('nocache') === 'true';

    // For filtering purposes, allow unlimited data
    // For pagination, cap at 500
    const limit = requestedLimit >= 100000 ? requestedLimit : Math.min(Math.max(1, requestedLimit), 500);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 [API REQUEST] /api/bigquery-data');
    console.log('📋 [PARAMS]', { page, limit, requestedLimit, noCache });
    console.log('🎯 [STRATEGY] Redis-First Architecture:');
    console.log('   1️⃣ Check Redis cache first');
    console.log('   2️⃣ If Redis has data → Use Redis (NO BigQuery call)');
    console.log('   3️⃣ If Redis empty → Fallback to BigQuery (auto-cache result)');
    if (noCache) {
      console.log('⚠️ [OVERRIDE] nocache=true detected - will skip Redis and query BigQuery directly');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Get all data (from Redis cache or BigQuery)
    let allData: LeadData[];
    const startTime = Date.now();
    
    if (noCache) {
      // Force refresh from BigQuery
      console.log('⚠️ [BIGQUERY CALL] nocache=true parameter detected - forcing BigQuery fetch...');
      console.log('📡 [BIGQUERY CALL] Querying BigQuery directly and updating Redis cache...');
      allData = await fetchAndCacheFromBigQuery();
      console.log(`✅ [BIGQUERY COMPLETE] Fetched ${allData.length} rows from BigQuery and cached in Redis`);
    } else {
      // REDIS-FIRST with BigQuery fallback
      console.log('🔍 [REDIS FIRST] Checking Redis cache first...');
      allData = await getAllData();
      
      // If Redis is empty, fallback to BigQuery automatically
      if (allData.length === 0) {
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('⚠️ [REDIS MISS] Redis cache is empty - falling back to BigQuery');
        console.warn('📡 [BIGQUERY FALLBACK] Automatically calling BigQuery to fetch data');
        console.warn('💡 [INFO] This is a fallback - future requests will use Redis cache');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Fallback to BigQuery and cache the result
        allData = await fetchAndCacheFromBigQuery();
        console.log(`✅ [BIGQUERY FALLBACK] Fetched ${allData.length} rows from BigQuery and cached in Redis`);
      }
    }
    
    const dataLoadTime = Date.now() - startTime;
    console.log(`⏱️ [TIMING] Data load time: ${dataLoadTime}ms`);

    // Calculate pagination
    const paginationStart = Date.now();
    const totalCount = allData.length;
    const offset = (page - 1) * limit;
    const paginatedData = allData.slice(offset, offset + limit);
    const paginationTime = Date.now() - paginationStart;

    // Determine the actual source that was used
    const dataSource = noCache ? 'BigQuery (forced)' : 'Redis cache';
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ [SUCCESS] Returning ${paginatedData.length.toLocaleString()} rows (page ${page} of ${Math.ceil(totalCount / limit)})`);
    console.log(`📊 [SOURCE] Data served from: ${dataSource}`);
    console.log(`⏱️ [TIMING] Total request time: ${dataLoadTime}ms | Pagination: ${paginationTime}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      data: paginatedData,
      totalCount,
      page,
      limit,
      cached: !noCache,
    });

  } catch (error) {
    console.error('❌ Data API Error:', error);
    
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

