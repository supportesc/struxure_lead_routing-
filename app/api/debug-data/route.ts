import { NextResponse } from 'next/server';
import { getCachedData } from '@/lib/redis';

const FULL_CACHE_KEY = 'bigquery_leads_full_cache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/debug-data
 * 
 * Debug endpoint to check timestamp formats
 */
export async function GET() {
  try {
    console.log('🔍 Debugging data formats...');
    
    // Get cached data from Redis
    const cachedData = await getCachedData(FULL_CACHE_KEY);
    
    if (!cachedData || !Array.isArray(cachedData) || cachedData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No cached data found in Redis',
        cacheKey: FULL_CACHE_KEY
      });
    }

    // Get first 5 and last 5 records
    const firstRecords = cachedData.slice(0, 5);
    const lastRecords = cachedData.slice(-5);
    const middleRecords = cachedData.slice(Math.floor(cachedData.length / 2), Math.floor(cachedData.length / 2) + 5);
    
    // Analyze timestamps
    const timestampAnalysis = firstRecords.map((record, idx) => {
      const timestamp = record.Timestamp;
      const timestampType = typeof timestamp;
      const timestampString = timestamp?.toString();
      let parsedDate = null;
      let isValidDate = false;
      
      try {
        parsedDate = new Date(timestamp);
        isValidDate = !isNaN(parsedDate.getTime());
      } catch (e) {
        parsedDate = null;
      }
      
      return {
        index: idx,
        rawTimestamp: timestamp,
        type: timestampType,
        asString: timestampString,
        parsedDate: parsedDate?.toISOString(),
        isValid: isValidDate,
        fullRecord: {
          Timestamp: record.Timestamp,
          Route_To: record.Route_To,
          First_Name: record.First_Name,
          Last_Name: record.Last_Name,
          Project_Type: record.Project_Type
        }
      };
    });

    // Get date range
    const allDates = cachedData
      .map(item => {
        try {
          const date = new Date(item.Timestamp);
          return isNaN(date.getTime()) ? null : date;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const validDates = allDates.length;
    const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d!.getTime()))) : null;
    const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d!.getTime()))) : null;

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords: cachedData.length,
        validDates: validDates,
        invalidDates: cachedData.length - validDates,
        dateRange: {
          oldest: minDate?.toISOString(),
          newest: maxDate?.toISOString(),
          oldestFormatted: minDate?.toLocaleDateString(),
          newestFormatted: maxDate?.toLocaleDateString()
        }
      },
      timestampSamples: {
        first5: timestampAnalysis,
        last5: lastRecords.slice(0, 5).map(r => ({
          Timestamp: r.Timestamp,
          type: typeof r.Timestamp,
          parsed: new Date(r.Timestamp).toISOString()
        })),
        middle5: middleRecords.slice(0, 5).map(r => ({
          Timestamp: r.Timestamp,
          type: typeof r.Timestamp,
          parsed: new Date(r.Timestamp).toISOString()
        }))
      },
      sampleRecords: {
        first: firstRecords[0],
        last: lastRecords[0]
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

