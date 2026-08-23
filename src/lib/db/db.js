// src/lib/db/db.js
import mysql from 'mysql2/promise';

let pool = null;

function getPool() {
  if (!pool) {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const isSSL = process.env.DB_SSL === 'true' || port === 4000 || host.includes('tidbcloud.com');

    pool = mysql.createPool({
      host: host,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'classconnectdb',
      port: port,
      ssl: isSSL ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  try {
    const p = getPool();
    const [rows] = await p.query(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getConnection() {
  const p = getPool();
  return p.getConnection();
}

export default { query, getConnection };