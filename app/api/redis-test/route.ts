import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET() {
  try {
    const redis = await getRedisClient();
    await redis.set('test_key', 'test_value', { EX: 10 });
    const value = await redis.get('test_key');
    
    return NextResponse.json({
      success: true,
      message: 'Redis is working!',
      test: value,
      redisUrl: process.env.REDIS_URL,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      redisUrl: process.env.REDIS_URL,
    }, { status: 500 });
  }
}

