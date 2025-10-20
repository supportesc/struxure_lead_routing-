import { createClient } from 'redis';

let client: ReturnType<typeof createClient> | null = null;

function getRedisClient() {
  if (!client) {
    const isProduction = process.env.NODE_ENV === 'production';
    const isBuildTime = typeof window === 'undefined' && !process.env.VERCEL_ENV;
    
    // Skip Redis during build time
    if (isBuildTime) {
      console.log('🚫 [REDIS] Skipping Redis client creation during build time');
      return null;
    }
    
    // Create Redis client with proper TLS settings
    client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: false, // ✅ FIX: Disable TLS for plain redis:// connections
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error('❌ [REDIS] Max reconnection attempts reached');
            return new Error('Max retries reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });
    
    client.on('error', (err) => {
      console.error('❌ [REDIS] Client Error:', err.message);
    });
    
    client.on('connect', () => {
      console.log('✅ [REDIS] Connected successfully');
    });
  }
  
  return client;
}

export async function getCachedData(key: string) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('⚠️ [REDIS] Client not available');
      return null;
    }
    
    if (!redis.isOpen) {
      await redis.connect();
    }
    
    const cached = await redis.get(key);
    if (!cached) return null;
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('❌ [REDIS] getCachedData error:', error);
    throw error; // Let the API route handle the error
  }
}

export async function setCachedData(key: string, data: any, ttl?: number) {
  try {
    const redis = getRedisClient();
    if (!redis) {
      console.warn('⚠️ [REDIS] Client not available');
      return false;
    }
    
    if (!redis.isOpen) {
      await redis.connect();
    }
    
    const serialized = JSON.stringify(data);
    
    if (ttl) {
      await redis.setEx(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
    
    console.log(`✅ [REDIS] Cached ${key} (TTL: ${ttl || 'none'})`);
    return true;
  } catch (error) {
    console.error('❌ [REDIS] setCachedData error:', error);
    throw error;
  }
}