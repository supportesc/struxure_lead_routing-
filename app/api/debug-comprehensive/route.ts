import { NextResponse } from 'next/server';
import { getCachedData } from '@/lib/redis';
import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';
import fs from 'fs';

const FULL_CACHE_KEY = 'bigquery_leads_full_cache';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testFilter = searchParams.get('testFilter');
    
    console.log('🔍 Comprehensive Debug Analysis...');
    
    // 1. Get data from Redis
    console.log('📦 Step 1: Fetching from Redis...');
    const redisData = await getCachedData(FULL_CACHE_KEY);
    
    if (!redisData || !Array.isArray(redisData) || redisData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No data found in Redis cache',
      }, { status: 404 });
    }

    // 2. Get data from BigQuery for comparison
    console.log('📊 Step 2: Fetching from BigQuery...');
    const credentialsPath = path.join(process.cwd(), 'bigquery-credentials.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    const bigquery = new BigQuery({
      projectId: 'oceanic-sky-474609-v5',
      credentials,
    });

    const query = `
      SELECT Timestamp, First_Name, Last_Name, Route_To, Project_Type
      FROM \`oceanic-sky-474609-v5.lead_generation.struxure_leads\`
      ORDER BY Timestamp DESC
      LIMIT 100
    `;
    
    const [bqRows] = await bigquery.query(query);

    // 3. Analyze timestamp formats
    console.log('🔬 Step 3: Analyzing timestamp formats...');
    
    const analyzeTimestamps = (data: any[], source: string) => {
      const samples = data.slice(0, 10);
      const timestampAnalysis = samples.map((item, index) => {
        const rawTimestamp = item.Timestamp;
        const parsedDate = new Date(rawTimestamp);
        const isValid = !isNaN(parsedDate.getTime());
        
        return {
          index,
          source,
          rawTimestamp,
          type: typeof rawTimestamp,
          parsedDate: isValid ? parsedDate.toISOString() : 'INVALID',
          isValid,
          year: isValid ? parsedDate.getFullYear() : null,
          month: isValid ? parsedDate.getMonth() + 1 : null,
          day: isValid ? parsedDate.getDate() : null,
          hour: isValid ? parsedDate.getHours() : null,
          minute: isValid ? parsedDate.getMinutes() : null,
          second: isValid ? parsedDate.getSeconds() : null,
        };
      });
      
      return timestampAnalysis;
    };

    const redisAnalysis = analyzeTimestamps(redisData, 'Redis');
    const bqAnalysis = analyzeTimestamps(bqRows, 'BigQuery');

    // 4. Test filtering logic
    console.log('🧪 Step 4: Testing filtering logic...');
    
    let filterTestResults = null;
    if (testFilter === 'last7days') {
      // Simulate Last 7 Days filter
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1); // Yesterday
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7); // 7 days ago
      
      const filterRange = {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      };
      
      console.log('🎯 Testing Last 7 Days filter:', filterRange);
      
      // Test filtering logic
      const startDateObj = new Date(filterRange.start);
      startDateObj.setHours(0, 0, 0, 0);
      const endDateObj = new Date(filterRange.end);
      endDateObj.setHours(23, 59, 59, 999);
      
      let validCount = 0;
      let invalidCount = 0;
      const sampleMatches: any[] = [];
      const sampleNonMatches: any[] = [];
      
      const filteredResults = redisData.filter(item => {
        if (!item.Timestamp) {
          invalidCount++;
          return false;
        }
        
        const timestamp = item.Timestamp.toString();
        const itemDate = new Date(timestamp);
        
        if (isNaN(itemDate.getTime())) {
          invalidCount++;
          return false;
        }
        
        // Normalize to date only (ignore time)
        const year = itemDate.getFullYear();
        const month = itemDate.getMonth();
        const day = itemDate.getDate();
        const normalizedItemDate = new Date(year, month, day);
        
        const inRange = normalizedItemDate >= startDateObj && normalizedItemDate <= endDateObj;
        
        if (inRange) {
          validCount++;
          if (sampleMatches.length < 5) {
            sampleMatches.push({
              timestamp: item.Timestamp,
              parsed: normalizedItemDate.toLocaleDateString(),
              name: `${item.First_Name} ${item.Last_Name}`,
              routeTo: item.Route_To
            });
          }
        } else {
          if (sampleNonMatches.length < 5) {
            sampleNonMatches.push({
              timestamp: item.Timestamp,
              parsed: normalizedItemDate.toLocaleDateString(),
              name: `${item.First_Name} ${item.Last_Name}`,
              tooOld: normalizedItemDate < startDateObj,
              tooNew: normalizedItemDate > endDateObj
            });
          }
        }
        
        return inRange;
      });
      
      filterTestResults = {
        filterRange,
        totalRecords: redisData.length,
        filteredCount: filteredResults.length,
        validCount,
        invalidCount,
        sampleMatches,
        sampleNonMatches,
        firstFewFiltered: filteredResults.slice(0, 10).map(item => ({
          timestamp: item.Timestamp,
          name: `${item.First_Name} ${item.Last_Name}`,
          routeTo: item.Route_To
        }))
      };
    }

    // 5. Date range analysis
    console.log('📅 Step 5: Analyzing date ranges...');
    
    const getDateRange = (data: any[]) => {
      const validDates = data
        .map(item => new Date(item.Timestamp))
        .filter(date => !isNaN(date.getTime()));
      
      if (validDates.length === 0) return null;
      
      const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...validDates.map(d => d.getTime())));
      
      return {
        oldest: minDate.toISOString(),
        newest: maxDate.toISOString(),
        oldestFormatted: minDate.toLocaleDateString(),
        newestFormatted: maxDate.toLocaleDateString(),
        totalValidDates: validDates.length,
        totalRecords: data.length
      };
    };

    const redisDateRange = getDateRange(redisData);
    const bqDateRange = getDateRange(bqRows);

    // 6. Check for October 2025 data specifically
    console.log('🔍 Step 6: Checking for October 2025 data...');
    
    const october2025Data = redisData.filter(item => {
      const date = new Date(item.Timestamp);
      return date.getFullYear() === 2025 && date.getMonth() === 9; // October is month 9 (0-indexed)
    });
    
    const october2025Analysis = {
      count: october2025Data.length,
      samples: october2025Data.slice(0, 10).map(item => ({
        timestamp: item.Timestamp,
        name: `${item.First_Name} ${item.Last_Name}`,
        routeTo: item.Route_To,
        parsedDate: new Date(item.Timestamp).toLocaleDateString()
      }))
    };

    return NextResponse.json({
      success: true,
      summary: {
        redisRecords: redisData.length,
        bqRecords: bqRows.length,
        redisDateRange,
        bqDateRange,
        october2025Analysis
      },
      timestampAnalysis: {
        redis: redisAnalysis,
        bigquery: bqAnalysis
      },
      filterTest: filterTestResults,
      recommendations: [
        "Check if timestamp formats are consistent between Redis and BigQuery",
        "Verify date parsing logic handles timezone correctly",
        "Ensure filtering logic matches expected date ranges",
        "Check if data is properly sorted chronologically"
      ]
    });

  } catch (error) {
    console.error('❌ Debug API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
