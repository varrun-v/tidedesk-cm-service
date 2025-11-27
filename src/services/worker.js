import db from './db.service.js';
import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';

async function processNext() {
  const rows = await db.query('SELECT * FROM ota_retry_queue WHERE next_try_at <= NOW() ORDER BY next_try_at ASC LIMIT 10');
  for (const r of rows) {
    try {
      const endpoint = r.endpoint;
      const payload = JSON.parse(r.payload);
      const headers = JSON.parse(r.headers || '{}');
      const res = await axios.post(endpoint, payload, { headers, timeout:15000 });
      // success => delete row
      await db.query('DELETE FROM ota_retry_queue WHERE id = ?', [r.id]);
      await db.query('INSERT INTO channel_logs (property_id, channel, message, payload) VALUES (?, ?, ?, ?)', [
        null, 'aiosell', 'retry success', JSON.stringify({ endpoint, status: res.status, data: res.data })
      ]);
    } catch (err) {
      await db.query('UPDATE ota_retry_queue SET try_count = try_count + 1, next_try_at = DATE_ADD(NOW(), INTERVAL LEAST(POWER(2, try_count), 3600) SECOND) WHERE id = ?', [r.id]);
      logger.error('retry failed', err.message);
    }
  }
}

setInterval(processNext, 15000); // run every 15s
