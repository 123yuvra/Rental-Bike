const mysql = require('mysql2/promise');

const conn = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'rental_bike',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection on startup
conn.query('SELECT 1')
  .then(() => console.log('Database connected successfully.'))
  .catch(err => {
    console.error('================================================');
    console.error('DATABASE CONNECTION FAILURE');
    console.error('Code:', err.code, '| No:', err.errno);
    console.error('Message:', err.message);
    console.error('================================================');
    console.error('TROUBLESHOOTING:');
    console.error('  - ECONNREFUSED: Is MySQL/MariaDB running?');
    console.error('  - ER_ACCESS_DENIED: Check DB_USER/DB_PASSWORD.');
    console.error('  - ER_BAD_DB_ERROR: Check if DB_NAME exists.');
    console.error('================================================');
    process.exit(-1);
  });

module.exports = conn;
