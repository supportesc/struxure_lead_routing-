import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
const client = createClient({
  url: redisUrl,
});

client.on('error', (err) => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('✅ Redis connected successfully'));

// Connect to Redis
let isConnected = false;

export async function getRedisClient() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
  }
  return client;
}

// Cache key for BigQuery data
const BIGQUERY_CACHE_KEY = 'bigquery_leads_full_cache';
const TTL = 60 * 60 * 24; // 24 hours in seconds

export async function getCachedData(key: string = BIGQUERY_CACHE_KEY) {
  try {
    const redis = await getRedisClient();
    const cached = await redis.get(key);
    
    if (cached) {
      console.log(`✅ Using cached data from Redis (key: ${key})`);
      return JSON.parse(cached);
    }
    
    console.log(`❌ No cached data found in Redis (key: ${key})`);
    return null;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
}

export async function setCachedData(key: string, data: any, ttl: number = TTL) {
  try {
    const redis = await getRedisClient();
    await redis.setEx(key, ttl, JSON.stringify(data));
    console.log(`✅ Data cached in Redis (key: ${key}, TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error('Error setting cached data:', error);
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

