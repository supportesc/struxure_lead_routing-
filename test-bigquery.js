const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');

async function testBigQuery() {
  try {
    console.log('🔍 Testing BigQuery connection...\n');

    // Load credentials
    const credentialsPath = path.join(__dirname, 'bigquery-credentials.json');
    const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsContent);

    // Create BigQuery client
    const bigquery = new BigQuery({
      projectId: 'oceanic-sky-474609-v5',
      credentials,
    });

    console.log('✅ BigQuery client created\n');

    // Query to count all rows
    const countQuery = `
      SELECT COUNT(*) as total_rows
      FROM \`oceanic-sky-474609-v5.lead_generation.struxure_leads\`
    `;

    console.log('📊 Executing query...\n');
    const [rows] = await bigquery.query(countQuery);

    console.log('═══════════════════════════════════════');
    console.log('  TOTAL ROWS IN BIGQUERY TABLE');
    console.log('═══════════════════════════════════════');
    console.log(`  ${rows[0].total_rows.toLocaleString()} rows`);
    console.log('═══════════════════════════════════════\n');

    // Query to get first 3 rows as sample
    const sampleQuery = `
      SELECT *
      FROM \`oceanic-sky-474609-v5.lead_generation.struxure_leads\`
      ORDER BY Timestamp DESC
      LIMIT 3
    `;

    console.log('📝 Fetching sample data...\n');
    const [sampleRows] = await bigquery.query(sampleQuery);

    console.log('Sample data (first 3 rows):');
    console.log('─────────────────────────────────────');
    sampleRows.forEach((row, idx) => {
      console.log(`\n${idx + 1}. ${row.First_Name} ${row.Last_Name}`);
      console.log(`   Email: ${row.Email}`);
      console.log(`   Route: ${row.Route_To}`);
      console.log(`   Date: ${row.Timestamp}`);
    });
    console.log('\n─────────────────────────────────────');

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testBigQuery();

