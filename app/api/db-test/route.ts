import { NextResponse } from 'next/server';
import { testConnection, listTables } from '@/lib/mysql';

export async function GET() {
  try {
    console.log('🔍 Testing MySQL connection...');
    console.log('DB Host:', process.env.DB_HOST);
    console.log('DB Port:', process.env.DB_PORT);
    console.log('DB User:', process.env.DB_USER);
    console.log('DB Name:', process.env.DB_NAME);
    
    // Test connection
    const isConnected = await testConnection();
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to MySQL database',
      }, { status: 500 });
    }

    // List all tables
    const tables = await listTables();
    
    return NextResponse.json({
      success: true,
      message: 'MySQL connection successful (READ-ONLY mode)',
      tables: tables,
      tableCount: Array.isArray(tables) ? tables.length : 0,
    });
  } catch (error) {
    console.error('Database test error (FULL):', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack,
      details: String(error),
    }, { status: 500 });
  }
}

