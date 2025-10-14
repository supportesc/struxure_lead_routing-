import { createClient } from 'redis';

// Use local Redis by default for fast performance
// Only use remote Redis if explicitly set
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const isLocalRedis = redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1');

// Log which Redis we're connecting to
if (isLocalRedis) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 [REDIS] Connecting to: ⚡ LOCAL Redis (FAST)');
  console.log('🚀 [REDIS] Expected performance: 1-5ms read time');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
} else {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.warn('⚠️ [REDIS] Connecting to: 🐌 REMOTE Redis (SLOW)');
  console.warn('⚠️ [REDIS] Expected performance: 100-2000ms read time');
  console.warn('💡 [REDIS] Recommendation: Switch to LOCAL Redis for 50-200x faster performance');
  console.warn('💡 [REDIS] How: Remove REDIS_URL from .env.local or set to redis://localhost:6379');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Create Redis client
const client = createClient({
  url: redisUrl,
});

client.on('error', (err) => console.error('❌ [REDIS] Redis Client Error:', err));
client.on('connect', () => {
  console.log(`✅ [REDIS] Redis connected successfully to ${isLocalRedis ? 'LOCAL' : 'REMOTE'} server`);
  if (!isLocalRedis) {
    console.warn('⚠️ [REDIS] Performance warning: Using remote Redis will be SLOW (1-2 seconds per request)');
    console.warn('💡 [REDIS] Switch to local Redis for 50-200x performance improvement');
  }
});

// Connect to Redis
let isConnected = false;

export async function getRedisClient() {
  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw error;
    }
  }
  return client;
}

// Cache key for BigQuery data
const BIGQUERY_CACHE_KEY = 'bigquery_leads_full_cache';
const TTL = 60 * 60 * 24; // 24 hours in seconds

export async function getCachedData(key: string = BIGQUERY_CACHE_KEY) {
  try {
    console.log(`🔍 [REDIS READ] Attempting to read from Redis (key: ${key})...`);
    const startTime = Date.now();
    const redis = await getRedisClient();
    const cached = await redis.get(key);
    const redisTime = Date.now() - startTime;
    
    if (cached) {
      const dataSizeMB = (Buffer.byteLength(cached, 'utf8') / (1024 * 1024)).toFixed(2);
      console.log(`✅ [REDIS HIT] Found cached data in Redis`);
      console.log(`📊 [REDIS HIT] Size: ${dataSizeMB}MB, Redis read time: ${redisTime}ms`);
      
      // Performance warnings
      if (redisTime > 1000) {
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn(`⚠️ [PERFORMANCE] SLOW Redis read: ${redisTime}ms (expected <50ms)`);
        console.warn('⚠️ [PERFORMANCE] This is likely due to using REMOTE Redis');
        console.warn('💡 [SOLUTION] Switch to LOCAL Redis for 50-200x faster performance');
        console.warn('💡 [HOW TO FIX] Remove REDIS_URL from .env.local and restart the app');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else if (redisTime > 100) {
        console.warn(`⚠️ [PERFORMANCE] Slow Redis read: ${redisTime}ms (expected <50ms)`);
        console.warn('💡 [TIP] Consider switching to local Redis for better performance');
      } else {
        console.log(`⚡ [PERFORMANCE] Fast Redis read: ${redisTime}ms ✅`);
      }
      
      const parseStart = Date.now();
      const parsed = JSON.parse(cached);
      const parseTime = Date.now() - parseStart;
      console.log(`⏱️ [REDIS HIT] JSON parse time: ${parseTime}ms`);
      
      if (parseTime > 500) {
        console.warn(`⚠️ [PERFORMANCE] Slow JSON parse: ${parseTime}ms (data size: ${dataSizeMB}MB)`);
      }
      
      console.log(`✅ [REDIS HIT] Successfully returned ${Array.isArray(parsed) ? parsed.length.toLocaleString() : 'N/A'} items from cache`);
      
      const totalTime = redisTime + parseTime;
      console.log(`📊 [REDIS HIT] Total cache operation time: ${totalTime}ms`);
      
      return parsed;
    }
    
    console.log(`❌ [REDIS MISS] No cached data found in Redis (key: ${key})`);
    console.log(`⏱️ [REDIS MISS] Redis query time: ${redisTime}ms`);
    return null;
  } catch (error) {
    console.error('❌ [REDIS ERROR] Redis connection or read error:', error);
    console.log('💡 [REDIS ERROR] Make sure Redis is running locally or set REDIS_URL environment variable');
    return null;
  }
}

export async function setCachedData(key: string, data: any, ttl: number = TTL) {
  try {
    console.log(`📝 [REDIS WRITE] Preparing to write data to Redis (key: ${key})...`);
    const startTime = Date.now();
    const redis = await getRedisClient();
    const jsonString = JSON.stringify(data);
    const dataSizeMB = (Buffer.byteLength(jsonString, 'utf8') / (1024 * 1024)).toFixed(2);
    
    await redis.setEx(key, ttl, jsonString);
    const writeTime = Date.now() - startTime;
    
    const ttlHours = (ttl / 3600).toFixed(1);
    const expiresAt = new Date(Date.now() + (ttl * 1000)).toISOString();
    
    console.log(`✅ [REDIS WRITE] Data successfully cached in Redis`);
    console.log(`📊 [REDIS WRITE] Size: ${dataSizeMB}MB, Write time: ${writeTime}ms`);
    console.log(`⏱️ [REDIS WRITE] TTL: ${ttlHours} hours (expires at ${expiresAt})`);
    console.log(`✅ [REDIS WRITE] ${Array.isArray(data) ? data.length : 'N/A'} items cached`);
    return true;
  } catch (error) {
    console.error('❌ [REDIS WRITE ERROR] Failed to write data to Redis:', error);
    return false;
  }
}

export async function clearCache(key: string = BIGQUERY_CACHE_KEY) {
  try {
    const redis = await getRedisClient();
    await redis.del(key);
    console.log(`✅ Cache cleared from Redis (key: ${key})`);
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

