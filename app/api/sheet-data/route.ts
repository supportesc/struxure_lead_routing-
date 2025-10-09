import { NextResponse } from 'next/server';
import { getCachedData, setCachedData } from '@/lib/redis';

export type SheetData = {
  Timestamp: string;
  'Route To': string;
  'Project Type': string;
  'First Name': string;
  'Last Name': string;
  Email: string;
  Phone: number;
  Street: string;
  'City ': string;
  State: string;
  Zip: string | number;
  'UTM Source': string;
  Campaign: string;
  Medium: string;
  Content: string;
  Term: string;
  'Item Options': string;
  'Unique ID': string;
  'Struxure Dealer': string;
  'Deepwater Dealer': string;
};

async function fetchFromGoogleSheets(): Promise<SheetData[]> {
  const scriptUrl = 'https://script.google.com/macros/s/AKfycby86BD4LuL-9P9Pomng986Xv9k0sCCMEM9YnSgNaBTOFTGMFTNyyXtzaf2BlMc3iuc/exec';
  
  console.log('📥 Fetching fresh data from Google Sheets...');
  const response = await fetch(scriptUrl, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  const data: SheetData[] = await response.json();
  console.log(`✅ Fetched ${data.length} leads from Google Sheets`);
  
  return data;
}

export async function GET() {
  try {
    // Step 1: Check Redis cache first
    let data = await getCachedData();

    // Step 2: If no cache, fetch from Google Sheets and cache it
    if (!data) {
      console.log('🔄 Cache miss - fetching from Google Sheets...');
      data = await fetchFromGoogleSheets();
      
      // Store in Redis with 24-hour TTL
      await setCachedData('google_sheets_data', data);
    }

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      cached: data !== null,
    });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    
    // Fallback: Try to fetch directly from Google Sheets if Redis fails
    try {
      console.log('⚠️ Redis error - falling back to direct fetch...');
      const data = await fetchFromGoogleSheets();
      
      return NextResponse.json({
        success: true,
        data,
        count: data.length,
        cached: false,
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  }
}

// New endpoint to manually refresh cache
export async function POST() {
  try {
    console.log('🔄 Manual cache refresh requested...');
    const data = await fetchFromGoogleSheets();
    await setCachedData('google_sheets_data', data);
    
    return NextResponse.json({
      success: true,
      message: 'Cache refreshed successfully',
      count: data.length,
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}



