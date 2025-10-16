import { createClient } from 'redis';

// Use environment Redis URL if available, otherwise disable Redis for production
const redisUrl = process.env.REDIS_URL;
const isProduction = process.env.NODE_ENV === 'production';
const isLocalRedis = redisUrl && (redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1'));

// In production without Redis, disable caching
if (isProduction && !redisUrl) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚫 [REDIS] Redis disabled in production - caching disabled');
  console.log('💡 [REDIS] Set REDIS_URL environment variable to enable caching');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
} else if (redisUrl) {
  // Log which Redis we're connecting to
  if (isLocalRedis) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 [REDIS] Connecting to: ⚡ LOCAL Redis (FAST)');
    console.log('🚀 [REDIS] Expected performance: 1-5ms read time');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 [REDIS] Connecting to: 🌐 REMOTE Redis');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// Create Redis client only if URL is provided
let client: any = null;
let isConnected = false;

if (redisUrl) {
  client = createClient({
    url: redisUrl,
  });

  client.on('error', (err) => console.error('❌ [REDIS] Redis Client Error:', err));
  client.on('connect', () => {
    console.log(`✅ [REDIS] Redis connected successfully to ${isLocalRedis ? 'LOCAL' : 'REMOTE'} server`);
  });
}

export async function getRedisClient() {
  if (!redisUrl) {
    return null;
  }
  
  if (!isConnected && client) {
    try {
      await client.connect();
      isConnected = true;
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      return null;
    }
  }
  return client;
}

// Cache key for BigQuery data
const BIGQUERY_CACHE_KEY = 'bigquery_leads_full_cache';
const TTL = 60 * 60 * 24; // 24 hours in seconds

export async function getCachedData(key: string = BIGQUERY_CACHE_KEY) {
  try {
    const redis = await getRedisClient();
    if (!redis) {
      console.log(`🚫 [REDIS READ] Redis not available - skipping cache read (key: ${key})`);
      return null;
    }
    
    console.log(`🔍 [REDIS READ] Attempting to read from Redis (key: ${key})...`);
    const startTime = Date.now();
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
    const redis = await getRedisClient();
    if (!redis) {
      console.log(`🚫 [REDIS WRITE] Redis not available - skipping cache write (key: ${key})`);
      return false;
    }
    
    console.log(`📝 [REDIS WRITE] Preparing to write data to Redis (key: ${key})...`);
    const startTime = Date.now();
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
    if (!redis) {
      console.log(`🚫 [REDIS CLEAR] Redis not available - skipping cache clear (key: ${key})`);
      return false;
    }
    
    await redis.del(key);
    console.log(`✅ Cache cleared from Redis (key: ${key})`);
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

