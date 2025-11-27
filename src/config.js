import dotenv from 'dotenv';
dotenv.config();

export default {
  // Render assigns a random port, so we must use process.env.PORT
  PORT: process.env.PORT || 10000, 
  DB: {
    // Render needs to know Hostinger's IP address
    host: process.env.DB_HOST, 
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 3306,
    // Important for remote connections to avoid timeouts
    waitForConnections: true,
    connectionLimit: 5, // Keep low for Shared Hosting [cite: 56]
  },
  AIOS: {
    baseUrl: process.env.AIOS_BASE_URL || 'https://live.aiosell.com/api', // [cite: 51]
  },
  INTERNAL_API_KEY: process.env.INTERNAL_API_KEY
};