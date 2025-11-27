import mysql from 'mysql2/promise';
import config from '../config.js';

const pool = mysql.createPool(config.DB);

export default {
  query: async (sql, params = []) => {
    const [rows] = await pool.query(sql, params);
    return rows;
  },
  // Helper to execute inside a transaction if needed
  getConnection: async () => await pool.getConnection()
};