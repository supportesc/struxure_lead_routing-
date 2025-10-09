const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function checkDatasetSize() {
  console.log('\n📊 DATASET SIZE ANALYSIS');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // 1. Check CSV file size
    console.log('📄 CSV FILE:');
    const csvPath = path.join(__dirname, 'Lead Generation - Struxure.csv');
    if (fs.existsSync(csvPath)) {
      const csvStats = fs.statSync(csvPath);
      console.log(`   File: Lead Generation - Struxure.csv`);
      console.log(`   Size: ${formatBytes(csvStats.size)}`);
      console.log(`   Raw:  ${csvStats.size.toLocaleString()} bytes`);
    } else {
      console.log('   ❌ CSV file not found');
    }

    // 2. Check BigQuery table size
    console.log('\n📊 BIGQUERY TABLE:');
    const credentialsPath = path.join(__dirname, 'bigquery-credentials.json');
    const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(credentialsContent);

    const bigquery = new BigQuery({
      projectId: 'oceanic-sky-474609-v5',
      credentials,
    });

    // Get table metadata
    const dataset = bigquery.dataset('lead_generation');
    const table = dataset.table('struxure_leads');
    const [metadata] = await table.getMetadata();

    const numRows = parseInt(metadata.numRows);
    const numBytes = parseInt(metadata.numBytes);
    const numLongTermBytes = parseInt(metadata.numLongTermBytes || 0);

    console.log(`   Table: lead_generation.struxure_leads`);
    console.log(`   Rows:  ${numRows.toLocaleString()}`);
    console.log(`   Size:  ${formatBytes(numBytes)}`);
    console.log(`   Raw:   ${numBytes.toLocaleString()} bytes`);
    
    if (numLongTermBytes > 0) {
      console.log(`   Long-term storage: ${formatBytes(numLongTermBytes)}`);
    }

    // 3. Calculate per-row average
    console.log('\n📏 PER-ROW STATISTICS:');
    const avgBytesPerRow = numBytes / numRows;
    console.log(`   Average size per row: ${formatBytes(avgBytesPerRow)}`);
    console.log(`   Estimated rows per MB: ${Math.floor(1048576 / avgBytesPerRow).toLocaleString()}`);

    // 4. Column count
    const schema = metadata.schema.fields;
    console.log(`   Number of columns: ${schema.length}`);

    // 5. Storage costs (approximate)
    console.log('\n💰 BIGQUERY STORAGE COST (Estimated):');
    const activeStorageGB = numBytes / (1024 * 1024 * 1024);
    const activeStorageCost = activeStorageGB * 0.02; // $0.02 per GB per month for active storage
    const longTermStorageGB = numLongTermBytes / (1024 * 1024 * 1024);
    const longTermStorageCost = longTermStorageGB * 0.01; // $0.01 per GB per month for long-term storage

    console.log(`   Active storage: ${activeStorageGB.toFixed(4)} GB`);
    console.log(`   Monthly cost: $${activeStorageCost.toFixed(4)}/month`);
    if (longTermStorageGB > 0) {
      console.log(`   Long-term storage: ${longTermStorageGB.toFixed(4)} GB`);
      console.log(`   Long-term cost: $${longTermStorageCost.toFixed(4)}/month`);
    }

    // 6. Schema details
    console.log('\n📋 TABLE SCHEMA:');
    schema.forEach((field, idx) => {
      console.log(`   ${idx + 1}. ${field.name} (${field.type})`);
    });

    // 7. Summary box
    console.log('\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('                     SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Total Rows:      ${numRows.toLocaleString()}`);
    console.log(`  Total Size:      ${formatBytes(numBytes)}`);
    console.log(`  Columns:         ${schema.length}`);
    console.log(`  Avg Row Size:    ${formatBytes(avgBytesPerRow)}`);
    console.log(`  Storage Cost:    ~$${activeStorageCost.toFixed(2)}/month`);
    console.log('═══════════════════════════════════════════════════\n');

    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatasetSize();

