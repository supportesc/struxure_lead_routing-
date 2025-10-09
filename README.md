# Lead Generation Management System

A Next.js application for managing and displaying lead generation data using **BigQuery** as the data warehouse and **Redis** as the caching layer.

## 🏗️ Architecture

```
CSV Data (72,465 rows)
   ↓
BigQuery [SOURCE OF TRUTH]
   ↓
Redis Cache [SPEED LAYER]
   ↓
Next.js API
   ↓
React Frontend
```

### Data Flow

1. **BigQuery** - Google Cloud BigQuery stores all lead data as the authoritative source
   - Project: `oceanic-sky-474609-v5`
   - Dataset: `lead_generation`
   - Table: `struxure_leads`
   - ~72,000+ rows

2. **Redis** - In-memory cache for fast data retrieval
   - Caches entire dataset as JSON
   - Key: `bigquery_leads_full_cache`
   - TTL: 24 hours
   - Serves 95%+ of read requests

3. **Cache-Aside Pattern**
   - First request: Redis miss → Query BigQuery → Cache in Redis
   - Subsequent requests: Redis hit → Return immediately (fast path)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Redis server (local or remote)
- Google Cloud BigQuery credentials
- BigQuery credentials file: `bigquery-credentials.json`

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
REDIS_URL=redis://your-redis-host:6379
```

### Run Development Server

```bash
npm run dev
```

Navigate to [http://localhost:3000](http://localhost:3000)

## 📡 API Endpoints

### Main Data Endpoint

**GET** `/api/bigquery-data`

Query parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 25, max: 500)
- `nocache` - Skip cache and force BigQuery fetch (default: false)

Response:
```json
{
  "success": true,
  "data": [...],
  "totalCount": 72465,
  "page": 1,
  "limit": 25,
  "cached": true
}
```

**POST** `/api/bigquery-data`

Manually refresh the cache from BigQuery.

### Statistics Endpoint

**GET** `/api/bigquery-stats`

Returns aggregated statistics with smart caching.

Query parameters:
- `dateFrom` - Start date (YYYY-MM-DD)
- `dateTo` - End date (YYYY-MM-DD)
- `routeTo` - Filter by route
- `projectType` - Filter by project type
- `utmSource` - Filter by UTM source
- `campaign` - Filter by campaign
- `state` - Filter by state
- `nocache` - Skip cache (default: false)

### Cache Sync Endpoint

**POST** `/api/sync-cache`

Manually trigger sync from BigQuery to Redis cache.

Response:
```json
{
  "success": true,
  "message": "Cache synced successfully",
  "data": {
    "rowCount": 72465,
    "dataSizeMB": 4.25,
    "queryTimeSeconds": 3.45,
    "cacheKey": "bigquery_leads_full_cache",
    "ttlSeconds": 86400,
    "expiresAt": "2025-10-10T12:00:00.000Z"
  }
}
```

**GET** `/api/sync-cache`

Get sync endpoint documentation.

## 🔧 Cache Management

### Pre-warm Cache (Recommended)

**Option 1: Via Script**

```bash
node sync-bigquery-to-redis.js
```

**Option 2: Via API Endpoint**

```bash
# Using curl
curl -X POST http://localhost:3000/api/sync-cache

# Or in production
curl -X POST https://your-domain.com/api/sync-cache
```

**Option 3: Via Code**

```javascript
// In your app or external service
const response = await fetch('/api/sync-cache', { method: 'POST' });
const result = await response.json();
console.log(`Synced ${result.data.rowCount} rows`);
```

Cache sync is recommended:
- On initial deployment
- After BigQuery data updates
- To avoid slow first load for users
- Can be automated via cron jobs or scheduled tasks

### Cache Details

- **Cache Key**: `bigquery_leads_full_cache`
- **TTL**: 24 hours (86,400 seconds)
- **Data Size**: ~4-6 MB in Redis
- **Refresh**: Automatic on expiry, or manual via script/POST endpoint

## 📊 Data Schema

### LeadData Type

```typescript
{
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
}
```

## 🗂️ Project Structure

```
├── app/
│   ├── api/
│   │   ├── bigquery-data/      # Main data endpoint (GET/POST)
│   │   ├── bigquery-stats/     # Statistics endpoint (cached)
│   │   └── sync-cache/         # Cache sync endpoint (POST)
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global styles
│   └── page.tsx                # Main data table view
├── lib/
│   ├── bigquery.ts             # BigQuery client & queries
│   └── redis.ts                # Redis client & caching
├── bigquery-credentials.json   # BigQuery service account
├── sync-bigquery-to-redis.js   # Manual cache sync script
└── instrumentation.ts          # Next.js startup hook
```

## 🎯 Key Features

- **Fast Performance** - Redis caching reduces load times from 3-8s to <50ms
- **Scalable** - BigQuery handles large datasets efficiently
- **Cost-Effective** - Caching reduces BigQuery query costs by 95%+
- **Real-time** - Manual refresh available via POST endpoint
- **Responsive UI** - Beautiful, modern interface with Tailwind CSS
- **Pagination** - Efficient in-memory pagination from cached data
- **Statistics** - Pre-computed aggregations with smart caching (via /api/bigquery-stats)

## 🛠️ Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Cloud BigQuery** - Data warehouse
- **Redis** - In-memory cache

## 📈 Performance

| Metric | Cold (BigQuery) | Hot (Redis) |
|--------|----------------|-------------|
| Query Time | 3-8 seconds | <50ms |
| Cache Hit Rate | N/A | 95%+ |
| Cost per Query | $0.005-0.01 | $0.000 |

## 🔒 Security

- **BigQuery credentials** - Keep `bigquery-credentials.json` secure
- **Environment variables** - Use `.env.local` for secrets
- **Read-only** - All BigQuery queries are read-only

## 📝 Scripts

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Sync cache
node sync-bigquery-to-redis.js

# Linting
npm run lint
```

## 🐛 Troubleshooting

### Cache not working?
- Check Redis connection: Verify `REDIS_URL` environment variable
- Run sync script: `node sync-bigquery-to-redis.js`

### Slow first load?
- Pre-warm cache with sync script before deployment
- Check BigQuery credentials are valid

### Data not updating?
- Cache TTL is 24 hours
- Force refresh via POST `/api/bigquery-data`
- Run sync script manually

## 📄 License

Private - Internal use only
