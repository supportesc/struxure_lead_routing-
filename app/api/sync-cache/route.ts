import { NextResponse } from 'next/server';
import { setCachedData } from '@/lib/redis';

const FULL_CACHE_KEY = 'bigquery_leads_full_cache';

/**
 * Query all data from BigQuery and cache it in Redis
 * ⚠️ THIS FUNCTION CALLS BIGQUERY API
 */
async function syncBigQueryToRedis() {
  const { BigQuery } = await import('@google-cloud/bigquery');
  const fs = await import('fs');
  const path = await import('path');
  
  console.log('📥 [BIGQUERY] Starting BigQuery to Redis sync...');
  
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

