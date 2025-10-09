import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function GET() {
  let connection;
  
  try {
    console.log('🔍 Fetching leads from database...');
    
    connection = await mysql.createConnection({
      host: 'dbserver.live.d3001bed-1ebb-416d-abf0-812f45ca748f.drush.in',
      port: 11140,
      user: 'pantheon',
      password: '0VylhhVSGNQsRwL1ZTt88sGosncr6HeI',
      database: 'pantheon',
    });

    console.log('✅ Connected!');

    // Get total entry count
    const [countResult] = await connection.query('SELECT COUNT(*) as total FROM wp_gf_entry');
    const totalEntries = (countResult as any)[0].total;
    console.log(`📊 Total entries in database: ${totalEntries}`);

    // Get first 5 entries with their metadata
    const [entries] = await connection.query(`
      SELECT 
        e.id as entry_id,
        e.form_id,
        e.date_created,
        e.status,
        e.created_by
      FROM wp_gf_entry e
      ORDER BY e.id DESC
      LIMIT 5
    `);

    console.log('✅ Sample entries retrieved');

    // Get metadata for first entry
    const firstEntryId = (entries as any)[0]?.entry_id;
    let metadata = [];
    
    if (firstEntryId) {
      const [meta] = await connection.query(`
        SELECT 
          meta_key,
          meta_value
        FROM wp_gf_entry_meta
        WHERE entry_id = ?
        ORDER BY meta_key
      `, [firstEntryId]);
      
      metadata = meta;
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Lead data retrieved successfully!',
      totalEntries: totalEntries,
      sampleEntries: entries,
      firstEntryMetadata: metadata,
    });

  } catch (error) {
    console.error('❌ Query failed:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (e) {}
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

