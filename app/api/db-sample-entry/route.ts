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

    // Get the most recent entry with ALL numeric field IDs
    const [entries] = await connection.query(`
      SELECT 
        e.id as entry_id,
        e.date_created
      FROM wp_gf_entry e
      ORDER BY e.id DESC
      LIMIT 1
    `);

    const entryId = (entries as any)[0]?.entry_id;

    // Get ALL metadata for this entry (only numeric field IDs)
    const [metadata] = await connection.query(`
      SELECT 
        meta_key,
        meta_value
      FROM wp_gf_entry_meta
      WHERE entry_id = ?
      AND meta_key REGEXP '^[0-9.]+$'
      ORDER BY CAST(SUBSTRING_INDEX(meta_key, '.', 1) AS UNSIGNED), 
               CAST(SUBSTRING_INDEX(meta_key, '.', -1) AS UNSIGNED)
    `, [entryId]);

    await connection.end();

    return NextResponse.json({
      success: true,
      entryId: entryId,
      allFields: metadata,
    });

  } catch (error) {
    if (connection) await connection.end();
    
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

