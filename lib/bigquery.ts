import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';
import fs from 'fs';

// Lazy-loaded BigQuery client
let bigqueryClient: BigQuery | null = null;

function getBigQueryClient(): BigQuery {
  if (!bigqueryClient) {
    try {
      const credentialsPath = path.join(process.cwd(), 'bigquery-credentials.json');
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsContent);
      
      bigqueryClient = new BigQuery({
        projectId: 'oceanic-sky-474609-v5',
        credentials,
      });
      
      console.log('✅ BigQuery client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize BigQuery client:', error);
      throw new Error('Failed to initialize BigQuery client');
    }
  }
  return bigqueryClient;
}

// Dataset and table configuration
const DATASET_ID = 'lead_generation';
const TABLE_ID = 'struxure_leads';
const TABLE_PATH = `\`oceanic-sky-474609-v5.${DATASET_ID}.${TABLE_ID}\``;

export type LeadData = {
  Timestamp: string;
  Route_To: string;
  Project_Type: string;
  First_Name: string;
  Last_Name: string;
  Email: string;
  Phone: string;
  Street: string;
  City: string;
  State: string;
  Zip: string;
  UTM_Source: string;
  Campaign: string;
  Medium: string;
  Content: string;
  Term: string;
  Item_Options: string;
  Unique_ID: string;
  Struxure_Dealer: string;
  Deepwater_Dealer: string;
};

export type QueryFilters = {
  dateFrom?: string;
  dateTo?: string;
  routeTo?: string[];
  projectType?: string[];
  utmSource?: string[];
  campaign?: string[];
  state?: string[];
  struxureDealer?: string;
  deepwaterDealer?: string;
};

export type PaginationOptions = {
  page?: number;
  limit?: number;
};

/**
 * Build WHERE clause from filters
 */
function buildWhereClause(filters: QueryFilters): { where: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 0;

  // Date range filter
  if (filters.dateFrom) {
    conditions.push(`PARSE_TIMESTAMP('%m/%d/%Y %H:%M:%S', Timestamp) >= @dateFrom`);
    params.push({ name: 'dateFrom', value: filters.dateFrom });
  }
  if (filters.dateTo) {
    conditions.push(`PARSE_TIMESTAMP('%m/%d/%Y %H:%M:%S', Timestamp) <= @dateTo`);
    params.push({ name: 'dateTo', value: filters.dateTo });
  }

  // Route To filter
  if (filters.routeTo && filters.routeTo.length > 0) {
    conditions.push(`Route_To IN UNNEST(@routeTo)`);
    params.push({ name: 'routeTo', value: filters.routeTo });
  }

  // Project Type filter
  if (filters.projectType && filters.projectType.length > 0) {
    conditions.push(`Project_Type IN UNNEST(@projectType)`);
    params.push({ name: 'projectType', value: filters.projectType });
  }

  // UTM Source filter
  if (filters.utmSource && filters.utmSource.length > 0) {
    conditions.push(`UTM_Source IN UNNEST(@utmSource)`);
    params.push({ name: 'utmSource', value: filters.utmSource });
  }

  // Campaign filter
  if (filters.campaign && filters.campaign.length > 0) {
    conditions.push(`Campaign IN UNNEST(@campaign)`);
    params.push({ name: 'campaign', value: filters.campaign });
  }

  // State filter
  if (filters.state && filters.state.length > 0) {
    conditions.push(`State IN UNNEST(@state)`);
    params.push({ name: 'state', value: filters.state });
  }

  // Struxure Dealer filter
  if (filters.struxureDealer) {
    conditions.push(`Struxure_Dealer = @struxureDealer`);
    params.push({ name: 'struxureDealer', value: filters.struxureDealer });
  }

  // Deepwater Dealer filter
  if (filters.deepwaterDealer) {
    conditions.push(`Deepwater_Dealer = @deepwaterDealer`);
    params.push({ name: 'deepwaterDealer', value: filters.deepwaterDealer });
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

/**
 * Query leads with filters and pagination
 */
export async function queryLeads(
  filters: QueryFilters = {},
  pagination: PaginationOptions = {}
): Promise<{ data: LeadData[]; totalCount: number; page: number; limit: number }> {
  const { page = 1, limit = 25 } = pagination;
  const offset = (page - 1) * limit;

  const { where, params } = buildWhereClause(filters);

  // Query for data
  const dataQuery = `
    SELECT *
    FROM ${TABLE_PATH}
    ${where}
    ORDER BY Timestamp DESC
    LIMIT @limit
    OFFSET @offset
  `;

  // Query for total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM ${TABLE_PATH}
    ${where}
  `;

  const dataParams = [
    ...params,
    { name: 'limit', value: limit },
    { name: 'offset', value: offset },
  ];

  try {
    console.log('🔍 Executing BigQuery:', { filters, page, limit });

    const bigquery = getBigQueryClient();

    // Execute both queries
    const [dataResults] = await bigquery.query({
      query: dataQuery,
      params: dataParams,
    });

    const [countResults] = await bigquery.query({
      query: countQuery,
      params: params,
    });

    const totalCount = countResults[0]?.total || 0;

    console.log(`✅ BigQuery returned ${dataResults.length} rows (Total: ${totalCount})`);

    return {
      data: dataResults as LeadData[],
      totalCount: Number(totalCount),
      page,
      limit,
    };
  } catch (error) {
    console.error('❌ BigQuery error:', error);
    throw error;
  }
}

/**
 * Get aggregated statistics
 */
export async function getStats(filters: QueryFilters = {}): Promise<{
  routeToStats: Array<{ name: string; count: number }>;
  projectTypeStats: Array<{ name: string; count: number }>;
  utmSourceStats: Array<{ name: string; count: number }>;
  stateStats: Array<{ name: string; count: number }>;
  totalLeads: number;
}> {
  const { where, params } = buildWhereClause(filters);

  const query = `
    WITH filtered_data AS (
      SELECT *
      FROM ${TABLE_PATH}
      ${where}
    )
    SELECT
      (SELECT COUNT(*) FROM filtered_data) as total_leads,
      
      ARRAY(
        SELECT AS STRUCT Route_To as name, COUNT(*) as count
        FROM filtered_data
        WHERE Route_To IS NOT NULL
        GROUP BY Route_To
        ORDER BY count DESC
      ) as route_to_stats,
      
      ARRAY(
        SELECT AS STRUCT Project_Type as name, COUNT(*) as count
        FROM filtered_data
        WHERE Project_Type IS NOT NULL
        GROUP BY Project_Type
        ORDER BY count DESC
      ) as project_type_stats,
      
      ARRAY(
        SELECT AS STRUCT UTM_Source as name, COUNT(*) as count
        FROM filtered_data
        WHERE UTM_Source IS NOT NULL
        GROUP BY UTM_Source
        ORDER BY count DESC
        LIMIT 10
      ) as utm_source_stats,
      
      ARRAY(
        SELECT AS STRUCT State as name, COUNT(*) as count
        FROM filtered_data
        WHERE State IS NOT NULL
        GROUP BY State
        ORDER BY count DESC
        LIMIT 10
      ) as state_stats
  `;

  try {
    console.log('📊 Fetching aggregated stats from BigQuery...');
    
    const bigquery = getBigQueryClient();
    
    const [results] = await bigquery.query({
      query,
      params,
    });

    const row = results[0];

    return {
      routeToStats: row.route_to_stats || [],
      projectTypeStats: row.project_type_stats || [],
      utmSourceStats: row.utm_source_stats || [],
      stateStats: row.state_stats || [],
      totalLeads: Number(row.total_leads) || 0,
    };
  } catch (error) {
    console.error('❌ BigQuery stats error:', error);
    throw error;
  }
}

/**
 * Get leads for a specific dealer
 */
export async function getDealerLeads(
  dealerName: string,
  filters: QueryFilters = {},
  pagination: PaginationOptions = {}
): Promise<{ data: LeadData[]; totalCount: number; page: number; limit: number }> {
  const { page = 1, limit = 25 } = pagination;
  const offset = (page - 1) * limit;

  const { where: baseWhere, params: baseParams } = buildWhereClause(filters);

  // Add dealer filter
  const dealerCondition = `(Struxure_Dealer = @dealerName OR Deepwater_Dealer = @dealerName)`;
  const where = baseWhere 
    ? `${baseWhere} AND ${dealerCondition}`
    : `WHERE ${dealerCondition}`;

  const params = [
    ...baseParams,
    { name: 'dealerName', value: dealerName },
  ];

  // Query for data
  const dataQuery = `
    SELECT *
    FROM ${TABLE_PATH}
    ${where}
    ORDER BY Timestamp DESC
    LIMIT @limit
    OFFSET @offset
  `;

  // Query for total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM ${TABLE_PATH}
    ${where}
  `;

  const dataParams = [
    ...params,
    { name: 'limit', value: limit },
    { name: 'offset', value: offset },
  ];

  try {
    console.log(`🔍 Querying leads for dealer: ${dealerName}`);

    const bigquery = getBigQueryClient();

    const [dataResults] = await bigquery.query({
      query: dataQuery,
      params: dataParams,
    });

    const [countResults] = await bigquery.query({
      query: countQuery,
      params: params,
    });

    const totalCount = countResults[0]?.total || 0;

    return {
      data: dataResults as LeadData[],
      totalCount: Number(totalCount),
      page,
      limit,
    };
  } catch (error) {
    console.error('❌ BigQuery dealer query error:', error);
    throw error;
  }
}

/**
 * Get all unique dealers
 */
export async function getAllDealers(): Promise<{
  struxureDealers: string[];
  deepwaterDealers: string[];
}> {
  const query = `
    SELECT
      ARRAY_AGG(DISTINCT Struxure_Dealer IGNORE NULLS ORDER BY Struxure_Dealer) as struxure_dealers,
      ARRAY_AGG(DISTINCT Deepwater_Dealer IGNORE NULLS ORDER BY Deepwater_Dealer) as deepwater_dealers
    FROM ${TABLE_PATH}
  `;

  try {
    const bigquery = getBigQueryClient();
    const [results] = await bigquery.query(query);
    const row = results[0];

    return {
      struxureDealers: row.struxure_dealers || [],
      deepwaterDealers: row.deepwater_dealers || [],
    };
  } catch (error) {
    console.error('❌ BigQuery dealers query error:', error);
    throw error;
  }
}

/**
 * Test BigQuery connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const bigquery = getBigQueryClient();
    const query = `SELECT COUNT(*) as count FROM ${TABLE_PATH} LIMIT 1`;
    const [results] = await bigquery.query(query);
    console.log('✅ BigQuery connection successful');
    return true;
  } catch (error) {
    console.error('❌ BigQuery connection failed:', error);
    return false;
  }
}

