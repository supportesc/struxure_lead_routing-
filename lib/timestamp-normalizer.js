/**
 * Timestamp Normalization Utility (CommonJS version for sync script)
 * 
 * Ensures consistent timestamp formatting across the application
 * regardless of how data is inserted into BigQuery.
 */

/**
 * Normalize timestamp to consistent format
 * @param {string|Date} timestamp - Raw timestamp from BigQuery (could be any format)
 * @returns {string} Normalized timestamp in M/D/YYYY H:mm:ss format
 */
function normalizeTimestamp(timestamp) {
  if (!timestamp) {
    throw new Error('Timestamp is required');
  }

  let date;
  
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
function parseKnownFormats(timestampStr) {
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
 * Normalize an array of lead data
 */
function normalizeLeadTimestamps(leads) {
  return leads.map(lead => ({
    ...lead,
    Timestamp: normalizeTimestamp(lead.Timestamp)
  }));
}

/**
 * Get timestamp format statistics from a dataset
 */
function analyzeTimestampFormats(leads) {
  const formats = {};
  const samples = {};
  const inconsistent = [];

  leads.forEach((lead, index) => {
    try {
      const timestamp = lead.Timestamp;
      let format = 'unknown';
      
      if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}:\d{2}$/.test(timestamp)) {
        format = 'YYYY-MM-DD HH:mm:ss';
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}$/.test(timestamp)) {
        format = 'M/D/YYYY H:mm:ss';
      } else if (timestamp.includes('T') && timestamp.includes('Z')) {
        format = 'ISO';
      }

      formats[format] = (formats[format] || 0) + 1;
      
      if (!samples[format]) {
        samples[format] = [];
      }
      
      if (samples[format].length < 3) {
        samples[format].push(timestamp);
      }
    } catch (error) {
      inconsistent.push(`Record ${index}: ${lead.Timestamp} - ${error.message}`);
    }
  });

  return {
    total: leads.length,
    formats,
    samples,
    inconsistent
  };
}

module.exports = {
  normalizeTimestamp,
  normalizeLeadTimestamps,
  analyzeTimestampFormats
};
