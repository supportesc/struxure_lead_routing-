import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  let connection;
  
  try {
    console.log('🔍 Attempting simple MySQL connection with hardcoded credentials...');
    
    // Hardcoded connection - SIMPLEST POSSIBLE
    connection = await mysql.createConnection({
      host: 'dbserver.live.d3001bed-1ebb-416d-abf0-812f45ca748f.drush.in',
      port: 11140,
      user: 'pantheon',
      password: '0VylhhVSGNQsRwL1ZTt88sGosncr6HeI',
      database: 'pantheon',
    });

    console.log('✅ Connection created successfully!');

    // Simple test query
    const [rows] = await connection.query('SELECT 1 as test');
    console.log('✅ Test query successful!');

    // List tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log('✅ Tables retrieved:', tables);

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'MySQL connection successful!',
      testQuery: rows,
      tables: tables,
      tableCount: Array.isArray(tables) ? tables.length : 0,
    });

  } catch (error) {
    console.error('❌ Connection failed:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: (error as any)?.code,
      errorDetails: String(error),
    }, { status: 500 });
  }
}

