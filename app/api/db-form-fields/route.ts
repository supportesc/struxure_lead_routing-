import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'dbserver.live.d3001bed-1ebb-416d-abf0-812f45ca748f.drush.in',
      port: 11140,
      user: 'pantheon',
      password: '0VylhhVSGNQsRwL1ZTt88sGosncr6HeI',
      database: 'pantheon',
    });

    // Get distinct meta_keys to see all available fields
    const [metaKeys] = await connection.query(`
      SELECT DISTINCT meta_key, COUNT(*) as count
      FROM wp_gf_entry_meta
      WHERE meta_key REGEXP '^[0-9.]+$'
      GROUP BY meta_key
      ORDER BY meta_key
    `);

    console.log('📋 All field IDs found:', metaKeys);

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'All Gravity Forms field IDs',
      fields: metaKeys,
      totalFields: Array.isArray(metaKeys) ? metaKeys.length : 0,
    });

  } catch (error) {
    if (connection) await connection.end();
    
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

