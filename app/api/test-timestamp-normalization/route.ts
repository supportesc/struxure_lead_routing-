import { NextRequest, NextResponse } from 'next/server';
import { getCachedData } from '@/lib/redis';
import { normalizeTimestamp, validateTimestamp, analyzeTimestampFormats, normalizeLeadTimestamps } from '@/lib/timestamp-normalizer';

// Force dynamic rendering - never pre-render this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * Test endpoint for timestamp normalization
 * GET /api/test-timestamp-normalization
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing timestamp normalization...');

    // Get sample data from cache
    const cached = await getCachedData();
    if (!cached || !Array.isArray(cached)) {
      return NextResponse.json({
        success: false,
        error: 'No cached data available'
      }, { status: 404 });
    }

    // Take first 100 records for testing
    const sampleData = cached.slice(0, 100);
    
    // Analyze current formats
    const formatAnalysis = analyzeTimestampFormats(sampleData);
    
    // Test normalization on a few samples
    const testSamples = sampleData.slice(0, 5).map((record, index) => {
      const original = record.Timestamp;
      const validation = validateTimestamp(original);
      const normalized = validation.isValid ? normalizeTimestamp(original) : null;
      
      return {
        index,
        original,
        validation,
        normalized,
        parsed: validation.isValid ? new Date(original).toISOString() : null,
        normalizedParsed: normalized ? new Date(normalized).toISOString() : null
      };
    });

    // Test full normalization
    const normalizedData = normalizeLeadTimestamps(sampleData);
    const normalizedAnalysis = analyzeTimestampFormats(normalizedData);

    return NextResponse.json({
      success: true,
      analysis: {
        original: formatAnalysis,
        normalized: normalizedAnalysis,
        samples: testSamples,
        summary: {
          totalRecords: sampleData.length,
          originalFormats: Object.keys(formatAnalysis.formats),
          inconsistentCount: formatAnalysis.inconsistent.length,
          normalizedFormats: Object.keys(normalizedAnalysis.formats),
          normalizationSuccess: normalizedAnalysis.inconsistent.length === 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Timestamp normalization test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to test timestamp normalization'
    }, { status: 500 });
  }
}
