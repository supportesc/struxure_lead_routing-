import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Step 1: Try to import BigQuery
    const { BigQuery } = await import('@google-cloud/bigquery');
    
    // Step 2: Try to load credentials
    const fs = await import('fs');
    const path = await import('path');
    const credentialsPath = path.join(process.cwd(), 'bigquery-credentials.json');
    const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsContent);
    
    // Step 3: Try to create BigQuery client
    const bigquery = new BigQuery({
      projectId: 'oceanic-sky-474609-v5',
      credentials,
    });
    
    // Step 4: Try a simple query
    const query = 'SELECT COUNT(*) as count FROM `oceanic-sky-474609-v5.lead_generation.struxure_leads` LIMIT 1';
    const [rows] = await bigquery.query(query);
    
    return NextResponse.json({
      success: true,
      message: 'BigQuery is working!',
      count: rows[0].count,
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

