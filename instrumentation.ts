export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 App startup - Redis cache ready for BigQuery data');
    console.log('💡 Tip: Run "node sync-bigquery-to-redis.js" to pre-warm the cache');
  }
}

