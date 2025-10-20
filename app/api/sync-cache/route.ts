import { NextResponse } from 'next/server';
import { setCachedData } from '@/lib/redis';

const FULL_CACHE_KEY = 'bigquery_leads_full_cache';

// Force dynamic rendering - never pre-render this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * Query all data from BigQuery and cache it in Redis
 * ⚠️ THIS FUNCTION CALLS BIGQUERY API
 */
async function syncBigQueryToRedis() {
  const { BigQuery } = await import('@google-cloud/bigquery');
  
  console.log('📥 [BIGQUERY] Starting BigQuery to Redis sync...');
  let bigquery;
  // Use environment variables for production
  if (process.env.BIGQUERY_PROJECT_ID && process.env.BIGQUERY_PRIVATE_KEY) {
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


     bigquery = new BigQuery({
      projectId: process.env.BIGQUERY_PROJECT_ID,
      credentials,
    });
    
    console.log('✅ BigQuery client initialized with environment variables');
  } else {
    throw new Error('BigQuery environment variables not configured');
  }

  const query = `
    SELECT *
    FROM \`${process.env.BIGQUERY_PROJECT_ID}.lead_generation.struxure_leads\`
  `;


  console.log('📡 [BIGQUERY] Executing BigQuery SQL query...');
  const startTime = Date.now();
  const [rows] = await bigquery.query(query);
  const queryTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`✅ [BIGQUERY] Fetched ${rows.length.toLocaleString()} rows from BigQuery in ${queryTime}s`);
  
  // Sort by timestamp DESC (BigQuery sorts strings alphabetically, not chronologically)
  rows.sort((a: any, b: any) => {
    const dateA = new Date(a.Timestamp);
    const dateB = new Date(b.Timestamp);
    return dateB.getTime() - dateA.getTime(); // DESC order (newest first)
  });
  
  console.log(`✅ Data sorted. Newest: ${rows[0]?.Timestamp}, Oldest: ${rows[rows.length - 1]?.Timestamp}`);

  // Calculate data size
  const dataString = JSON.stringify(rows);
  const dataSizeBytes = Buffer.byteLength(dataString, 'utf8');
  const dataSizeMB = (dataSizeBytes / (1024 * 1024)).toFixed(2);

  console.log(`📦 Data size: ${dataSizeMB} MB`);

  // Cache for 24 hours
  await setCachedData(FULL_CACHE_KEY, rows, 60 * 60 * 24);
  
  return {
    rowCount: rows.length,
    dataSizeMB: parseFloat(dataSizeMB),
    queryTime: parseFloat(queryTime),
  };
}

/**
 * POST /api/sync-cache
 * 
 * Manually trigger sync from BigQuery to Redis
 * ⚠️ THIS ENDPOINT CALLS BIGQUERY - Only use for manual cache refresh
 */
export async function POST() {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 [SYNC] Manual cache sync requested via /api/sync-cache');
    console.log('📡 [BIGQUERY CALL] This endpoint WILL call BigQuery API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const result = await syncBigQueryToRedis();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ [SYNC COMPLETE] BigQuery data successfully synced to Redis');
    console.log('📊 [STATS]', {
      rows: result.rowCount,
      sizeMB: result.dataSizeMB,
      queryTime: result.queryTime + 's',
      ttl: '24 hours'
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    return NextResponse.json({
      success: true,
      message: 'Cache synced successfully from BigQuery to Redis',
      data: {
        rowCount: result.rowCount,
        dataSizeMB: result.dataSizeMB,
        queryTimeSeconds: result.queryTime,
        cacheKey: FULL_CACHE_KEY,
        ttlSeconds: 60 * 60 * 24, // 24 hours
        expiresAt: new Date(Date.now() + (60 * 60 * 24 * 1000)).toISOString(),
      }
    });
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ [SYNC ERROR] Failed to sync cache from BigQuery to Redis');
    console.error('❌ [ERROR]', error);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to sync cache from BigQuery to Redis'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync-cache
 * 
 * Get sync endpoint information
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/sync-cache',
    method: 'POST',
    description: 'Sync all BigQuery data to Redis cache',
    cacheKey: FULL_CACHE_KEY,
    ttl: '24 hours',
    usage: {
      curl: 'curl -X POST http://localhost:3000/api/sync-cache',
      fetch: 'fetch("/api/sync-cache", { method: "POST" })',
    }
  });
}

