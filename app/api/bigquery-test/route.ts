import { NextResponse } from 'next/server';
import { testConnection, queryLeads } from '@/lib/bigquery';

/**
 * GET /api/bigquery-test
 * 
 * Test endpoint to verify BigQuery connection and query a small sample
 */
export async function GET() {
  try {
    console.log('🧪 Testing BigQuery connection...');

    // Test 1: Connection
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to connect to BigQuery',
          tests: {
            connection: false,
          }
        },
        { status: 500 }
      );
    }

    // Test 2: Query small sample
    console.log('🧪 Testing sample query...');
    const sampleResult = await queryLeads({}, { page: 1, limit: 5 });

    // Test 3: Query with filters
    console.log('🧪 Testing filtered query...');
    const filteredResult = await queryLeads(
      { routeTo: ['Struxure'] },
      { page: 1, limit: 3 }
    );

    return NextResponse.json({
      success: true,
      message: 'All BigQuery tests passed!',
      tests: {
        connection: true,
        sampleQuery: true,
        filteredQuery: true,
      },
      results: {
        totalLeads: sampleResult.totalCount,
        sampleData: {
          count: sampleResult.data.length,
          firstLead: sampleResult.data[0] || null,
        },
        filteredData: {
          count: filteredResult.data.length,
          totalStruxure: filteredResult.totalCount,
        },
      },
    });

  } catch (error) {
    console.error('❌ BigQuery Test Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

