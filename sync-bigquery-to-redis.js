const { BigQuery } = require('@google-cloud/bigquery');
const redis = require('redis');
const fs = require('fs');
const path = require('path');

async function syncBigQueryToRedis() {
  let redisClient;
  
  try {
    console.log('\n🔄 SYNCING BIGQUERY DATA TO REDIS');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. Connect to Redis
    console.log('🔌 Connecting to Redis...');
    redisClient = redis.createClient({
      url: 'redis://104.197.74.8:6379'
    });

    redisClient.on('error', (err) => console.error('Redis Error:', err));
    
    await redisClient.connect();
    console.log('✅ Connected to Redis\n');

    // 2. Load BigQuery credentials
    console.log('🔑 Loading BigQuery credentials...');
    const credentialsPath = path.join(__dirname, 'bigquery-credentials.json');
    const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsContent);
    console.log('✅ Credentials loaded\n');

    // 3. Create BigQuery client
    console.log('📊 Connecting to BigQuery...');
    const bigquery = new BigQuery({
      projectId: 'oceanic-sky-474609-v5',
      credentials,
    });
    console.log('✅ Connected to BigQuery\n');

    // 4. Query all data from BigQuery
    console.log('📥 Fetching ALL data from BigQuery...');
    console.log('   (This may take a moment for 72k+ rows)\n');
    
    const query = `
      SELECT *
      FROM \`oceanic-sky-474609-v5.lead_generation.struxure_leads\`
      ORDER BY Timestamp DESC
    `;

    const startTime = Date.now();
    const [rows] = await bigquery.query(query);
    const queryTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ Fetched ${rows.length.toLocaleString()} rows in ${queryTime}s\n`);

    // 5. Calculate data size
    const dataString = JSON.stringify(rows);
    const dataSizeBytes = Buffer.byteLength(dataString, 'utf8');
    const dataSizeMB = (dataSizeBytes / (1024 * 1024)).toFixed(2);

    console.log('📦 Data size in memory:');
    console.log(`   ${dataSizeMB} MB (${dataSizeBytes.toLocaleString()} bytes)\n`);

    // 6. Store in Redis with 24-hour TTL
    console.log('💾 Storing in Redis...');
    const cacheKey = 'bigquery_leads_full_cache';
    const ttl = 60 * 60 * 24; // 24 hours in seconds

    await redisClient.setEx(cacheKey, ttl, dataString);
    console.log(`✅ Data stored in Redis\n`);

    // 7. Verify the cache
    console.log('🔍 Verifying cache...');
    const ttlRemaining = await redisClient.ttl(cacheKey);
    const cachedData = await redisClient.get(cacheKey);
    const cachedRows = JSON.parse(cachedData);

    console.log(`✅ Cache verified\n`);

    // 8. Display results
    console.log('═══════════════════════════════════════════════════');
    console.log('                  SYNC COMPLETE!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Cache Key:       ${cacheKey}`);
    console.log(`  Rows Cached:     ${cachedRows.length.toLocaleString()}`);
    console.log(`  Data Size:       ${dataSizeMB} MB`);
    console.log(`  TTL:             ${ttl.toLocaleString()} seconds (24 hours)`);
    console.log(`  TTL Remaining:   ${ttlRemaining.toLocaleString()} seconds`);
    console.log(`  Expires At:      ${new Date(Date.now() + (ttlRemaining * 1000)).toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📊 Sample data (first row):');
    console.log('─────────────────────────────────────');
    const sample = cachedRows[0];
    console.log(`  Name: ${sample.First_Name} ${sample.Last_Name}`);
    console.log(`  Email: ${sample.Email}`);
    console.log(`  Route: ${sample.Route_To}`);
    console.log(`  Date: ${sample.Timestamp}`);
    console.log('─────────────────────────────────────\n');

    console.log('✅ Sync completed successfully!\n');

    // Close Redis connection
    await redisClient.quit();

  } catch (error) {
    console.error('\n❌ Error during sync:', error.message);
    console.error(error);
    
    if (redisClient) {
      await redisClient.quit();
    }
    
    process.exit(1);
  }
}

syncBigQueryToRedis();

