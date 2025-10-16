const mysql = require('mysql2/promise');

// Database configuration from environment variables
const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    acquireTimeout: 60000,
    reconnect: true,
    ssl: false
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Get Deep Water dealer assignment based on zip code
 * @param {string} zipCode - The zip code to look up
 * @returns {Promise<string|null>} - The dealer name or null if not found
 */
async function getDeepWaterDealerByZip(zipCode) {
    if (!zipCode || zipCode.trim() === '') {
        return null;
    }

    try {
        // Clean zip code - remove spaces and non-numeric characters except dash
        const cleanZip = zipCode.toString().replace(/\s/g, '').replace(/[^\d-]/g, '');
        
        // Extract the first 5 digits for lookup
        const zipPrefix = cleanZip.substring(0, 5);
        
        if (zipPrefix.length < 5) {
            return null;
        }

        const [rows] = await pool.execute(
            'SELECT dealer FROM Deepwater_zips WHERE zip_code = ? LIMIT 1',
            [zipPrefix]
        );

        return rows.length > 0 ? rows[0].dealer : null;
    } catch (error) {
        console.error('Error looking up dealer for zip code:', zipCode, error.message);
        return null;
    }
}

/**
 * Get all Deep Water dealer assignments for batch processing
 * @returns {Promise<Object>} - Object with zip codes as keys and dealers as values
 */
async function getAllDeepWaterDealers() {
    try {
        const [rows] = await pool.execute('SELECT zip_code, dealer FROM Deepwater_zips');
        
        const dealerMap = {};
        rows.forEach(row => {
            dealerMap[row.zip_code] = row.dealer;
        });
        
        return dealerMap;
    } catch (error) {
        console.error('Error fetching all Deep Water dealers:', error.message);
        return {};
    }
}

/**
 * Test database connection
 * @returns {Promise<boolean>} - True if connection successful
 */
async function testConnection() {
    try {
        console.log('Connecting to database:', {
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            database: dbConfig.database
        });
        
        const connection = await pool.getConnection();
        console.log('✅ Database connection successful');
        
        // Test a simple query
        const [rows] = await connection.execute('SELECT 1 as test');
        console.log('✅ Database query test successful:', rows);
        
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Error details:', error);
        return false;
    }
}

/**
 * Close database connection pool
 */
async function closeConnection() {
    await pool.end();
}

module.exports = {
    getDeepWaterDealerByZip,
    getAllDeepWaterDealers,
    testConnection,
    closeConnection
};
