import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Database info loaded from environment',
    config: {
      host: process.env.DB_HOST || 'NOT SET',
      port: process.env.DB_PORT || 'NOT SET',
      user: process.env.DB_USER || 'NOT SET',
      database: process.env.DB_NAME || 'NOT SET',
      hasPassword: !!process.env.DB_PASSWORD,
    }
  });
}

