import { getCachedData, setCachedData } from './redis';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby86BD4LuL-9P9Pomng986Xv9k0sCCMEM9YnSgNaBTOFTGMFTNyyXtzaf2BlMc3iuc/exec';

async function fetchFromGoogleSheets() {
  console.log('📥 Fetching data from Google Sheets...');
  const response = await fetch(GOOGLE_SCRIPT_URL, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`✅ Fetched ${data.length} leads from Google Sheets`);
  
  return data;
}

export async function initializeCache() {
  try {
    console.log('🚀 Initializing cache on app startup...');
    
    // Check if cache exists
    const cachedData = await getCachedData();
    
    if (cachedData) {
      console.log(`✅ Cache already exists with ${cachedData.length} leads`);
      return;
    }

    // Cache doesn't exist, fetch and populate
    console.log('❌ No cache found - fetching from Google Sheets...');
    const freshData = await fetchFromGoogleSheets();
    
    // Store in Redis with 24-hour TTL
    await setCachedData(freshData);
    console.log('✅ Cache initialized successfully with 24-hour TTL');
    
  } catch (error) {
    console.error('❌ Error initializing cache:', error);
    console.log('⚠️ App will continue without cache - will fetch on first request');
  }
}

