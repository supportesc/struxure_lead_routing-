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

    // Get 3 recent entries with ALL their metadata
    const [entries] = await connection.query(`
      SELECT 
        e.id as entry_id,
        e.date_created,
        GROUP_CONCAT(CONCAT(m.meta_key, ':', m.meta_value) SEPARATOR '|||') as all_meta
      FROM wp_gf_entry e
      LEFT JOIN wp_gf_entry_meta m ON e.id = m.entry_id
      WHERE m.meta_key IN ('1.3', '1.6', '16', '17', '18', '19', '4.1', '4.3', '4.4', '4.5')
      GROUP BY e.id
      ORDER BY e.id DESC
      LIMIT 3
    `);

    await connection.end();

    return NextResponse.json({
      success: true,
      entries: entries,
      fieldMapping: {
        '1.3': 'First Name',
        '1.6': 'Last Name', 
        '16': 'Project Type',
        '17': 'Phone',
        '18': 'Email',
        '19': 'UTM Source',
        '4.1': 'Street',
        '4.3': 'City',
        '4.4': 'State',
        '4.5': 'Zip',
      }
    });

  } catch (error) {
    if (connection) await connection.end();
    
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

