import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  const cwd = process.cwd();
  const credPath = path.join(cwd, 'bigquery-credentials.json');
  
  let fileExists = false;
  let fileSize = 0;
  
  try {
    const stats = fs.statSync(credPath);
    fileExists = true;
    fileSize = stats.size;
  } catch (error) {
    // File doesn't exist
  }
  
  return NextResponse.json({
    cwd,
    credPath,
    fileExists,
    fileSize,
    envRedisUrl: process.env.REDIS_URL || 'not set',
  });
}

