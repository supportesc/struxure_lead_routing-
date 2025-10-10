/**
 * Timestamp Normalization Utility
 * 
 * Ensures consistent timestamp formatting across the application
 * regardless of how data is inserted into BigQuery.
 */

export type TimestampFormat = 'M/D/YYYY H:mm:ss' | 'YYYY-MM-DD HH:mm:ss' | 'ISO';

/**
 * Normalize timestamp to consistent format
 * @param timestamp - Raw timestamp from BigQuery (could be any format)
 * @returns Normalized timestamp in M/D/YYYY H:mm:ss format
 */
export function normalizeTimestamp(timestamp: string | Date): string {
  if (!timestamp) {
    throw new Error('Timestamp is required');
  }

  let date: Date;
  
  // Handle Date objects
  if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    // Parse string timestamp
    const timestampStr = timestamp.toString().trim();
    
    // Try different parsing strategies
    try {
      // Strategy 1: Direct Date parsing (handles most formats)
      date = new Date(timestampStr);
      
      // Validate the parsed date
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      // Strategy 2: Manual parsing for known formats
      date = parseKnownFormats(timestampStr);
    }
  }

  // Convert to consistent format: M/D/YYYY H:mm:ss
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  return `${month}/${day}/${year} ${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse known timestamp formats manually
 */
function parseKnownFormats(timestampStr: string): Date {
  // Format 1: YYYY-MM-DD HH:mm:ss (your test lead format)
  const isoFormat = /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})$/;
  const isoMatch = timestampStr.match(isoFormat);
  if (isoMatch) {
    const [, year, month, day, hours, minutes, seconds] = isoMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  }

  // Format 2: M/D/YYYY H:mm:ss (existing format)
  const standardFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/;
  const standardMatch = timestampStr.match(standardFormat);
  if (standardMatch) {
    const [, month, day, year, hours, minutes, seconds] = standardMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // Month is 0-indexed
      parseInt(day),
      parseInt(hours),
      parseInt(minutes),
      parseInt(seconds)
    );
  }

  // If no known format matches, try default Date parsing
  const fallbackDate = new Date(timestampStr);
  if (isNaN(fallbackDate.getTime())) {
    throw new Error(`Unable to parse timestamp: ${timestampStr}`);
  }
  
  return fallbackDate;
}

/**
 * Validate timestamp format
 */
export function validateTimestamp(timestamp: string): {
  isValid: boolean;
  format: TimestampFormat | 'unknown';
  normalized: string | null;
  error?: string;
} {
  try {
    const normalized = normalizeTimestamp(timestamp);
    
    // Determine the original format
    let format: TimestampFormat | 'unknown' = 'unknown';
    
    if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}:\d{2}$/.test(timestamp)) {
      format = 'YYYY-MM-DD HH:mm:ss';
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}$/.test(timestamp)) {
      format = 'M/D/YYYY H:mm:ss';
    } else if (timestamp.includes('T') && timestamp.includes('Z')) {
      format = 'ISO';
    }
    
    return {
      isValid: true,
      format,
      normalized
    };
  } catch (error) {
    return {
      isValid: false,
      format: 'unknown',
      normalized: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Normalize an array of lead data
 */
export function normalizeLeadTimestamps(leads: any[]): any[] {
  return leads.map(lead => ({
    ...lead,
    Timestamp: normalizeTimestamp(lead.Timestamp)
  }));
}

/**
 * Get timestamp format statistics from a dataset
 */
export function analyzeTimestampFormats(leads: any[]): {
  total: number;
  formats: Record<string, number>;
  samples: Record<string, string[]>;
  inconsistent: string[];
} {
  const formats: Record<string, number> = {};
  const samples: Record<string, string[]> = {};
  const inconsistent: string[] = [];

  leads.forEach((lead, index) => {
    const validation = validateTimestamp(lead.Timestamp);
    
    if (!validation.isValid) {
      inconsistent.push(`Record ${index}: ${lead.Timestamp} - ${validation.error}`);
      return;
    }

    const format = validation.format;
    formats[format] = (formats[format] || 0) + 1;
    
    if (!samples[format]) {
      samples[format] = [];
    }
    
    if (samples[format].length < 3) {
      samples[format].push(lead.Timestamp);
    }
  });

  return {
    total: leads.length,
    formats,
    samples,
    inconsistent
  };
}
