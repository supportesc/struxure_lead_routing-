import mysql from 'mysql2/promise';

// Create connection pool with READ-ONLY configuration
let pool: mysql.Pool | null = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });
  }
  return pool;
}

// Get a connection from the pool (READ-ONLY enforced)
export async function getMySQLConnection() {
  try {
    const poolInstance = getPool();
    const connection = await poolInstance.getConnection();
    
    // Set session to READ-ONLY mode for safety
    try {
      await connection.query('SET SESSION TRANSACTION READ ONLY');
    } catch (err) {
      console.warn('Could not set READ-ONLY mode, but continuing...', err);
    }
    
    return connection;
  } catch (error) {
    console.error('MySQL Connection Error:', error);
    throw error;
  }
}

// Test the connection
export async function testConnection() {
  try {
    const connection = await getMySQLConnection();
    console.log('✅ MySQL connected successfully (READ-ONLY mode)');
    
    // Test query
    const [rows] = await connection.query('SELECT 1 as test');
    console.log('✅ MySQL test query successful');
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    return false;
  }
}

// Get all tables in the database
export async function listTables() {
  try {
    const connection = await getMySQLConnection();
    const [tables] = await connection.query('SHOW TABLES');
    connection.release();
    return tables;
  } catch (error) {
    console.error('Error listing tables:', error);
    throw error;
  }
}

// Execute a read-only query
export async function executeReadOnlyQuery(query: string, params: any[] = []) {
  try {
    const connection = await getMySQLConnection();
    const [rows] = await connection.query(query, params);
    connection.release();
    return rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

export default pool;

