import db from './db.service.js';
import axios from 'axios';
import config from '../config.js';

import { pushToChannelManager, buildInventoryPayload, buildRatesPayload, buildRestrictionsPayload } from '../controllers/sync.controller.js';

async function processSyncQueue() {
  // 1. Fetch PENDING items
  const rows = await db.query('SELECT * FROM ota_sync_queue WHERE status = "PENDING" ORDER BY created_at ASC LIMIT 10');

  for (const row of rows) {
    try {
      // Mark as PROCESSING
      await db.query('UPDATE ota_sync_queue SET status = "PROCESSING" WHERE id = ?', [row.id]);

      let payload;
      const startDate = new Date(row.start_date).toISOString().split('T')[0];
      const endDate = new Date(row.end_date).toISOString().split('T')[0];

      // Build Payload based on Type
      if (row.type === 'INVENTORY') {
        payload = await buildInventoryPayload(row.room_id, startDate, endDate, row.payload);
      } else if (row.type === 'RATES') {
        payload = await buildRatesPayload(row.room_id, startDate, endDate, row.payload);
      } else if (row.type === 'RESTRICTIONS') {
        payload = await buildRestrictionsPayload(row.room_id, startDate, endDate, row.payload);
      }

      // Push to Channel Manager
      if (payload) {
        await pushToChannelManager(payload, row.type);
      }

      // Success: Delete the row (or move to history if you prefer)
      await db.query('DELETE FROM ota_sync_queue WHERE id = ?', [row.id]);
      console.log(`Sync Success [${row.type}] ID: ${row.id}`);

    } catch (error) {
      console.error(`Sync Failed [${row.type}] ID: ${row.id}`, error.message);
      // Mark as FAILED with error message
      await db.query('UPDATE ota_sync_queue SET status = "FAILED", error_message = ?, retry_count = retry_count + 1 WHERE id = ?', [error.message, row.id]);
    }
  }
}

async function processNext() {
  const rows = await db.query('SELECT * FROM ota_retry_queue WHERE next_try_at <= NOW() ORDER BY next_try_at ASC LIMIT 10');
  for (const r of rows) {
    try {
      const endpoint = r.endpoint;
      const payload = JSON.parse(r.payload);
      const headers = JSON.parse(r.headers || '{}');
      const res = await axios.post(endpoint, payload, { headers, timeout: 15000 });
      // success => delete row
      await db.query('DELETE FROM ota_retry_queue WHERE id = ?', [r.id]);
      await db.query('INSERT INTO channel_logs (property_id, channel, message, payload) VALUES (?, ?, ?, ?)', [
        null, 'channel_manager', 'retry success', JSON.stringify({ endpoint, status: res.status, data: res.data })
      ]);
    } catch (err) {
      await db.query('UPDATE ota_retry_queue SET try_count = try_count + 1, next_try_at = DATE_ADD(NOW(), INTERVAL LEAST(POWER(2, try_count), 3600) SECOND) WHERE id = ?', [r.id]);
      console.error('retry failed', err.message);
    }
  }
}

async function cleanupZombies() {
  try {
    await db.query('DELETE FROM ota_webhook_logs WHERE created_at < NOW() - INTERVAL 30 DAY');
    await db.query('DELETE FROM ota_retry_queue WHERE created_at < NOW() - INTERVAL 7 DAY');
    // Also clean up old failed syncs
    await db.query('DELETE FROM ota_sync_queue WHERE status = "FAILED" AND created_at < NOW() - INTERVAL 7 DAY');
    console.log('Zombie cleanup completed');
  } catch (error) {
    console.error('Zombie cleanup failed', error);
  }
}

// Run retry worker every 15s
setInterval(processNext, 15000);

// Run Sync Queue Worker every 10s
setInterval(processSyncQueue, 10000);

// Run cleanup every 24 hours
setInterval(cleanupZombies, 24 * 60 * 60 * 1000);

console.log('Worker started: Sync Queue + Retry Queue + Zombie Cleaner');

// Heartbeat to confirm worker is alive (useful for debugging Render logs)
setInterval(() => console.log('Worker Heartbeat: I am alive...'), 30000);
