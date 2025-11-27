import db from './db.service.js';
export async function enqueueRetry(request_type, endpoint, payload, headers={}) {
  await db.query('INSERT INTO ota_retry_queue (request_type, endpoint, payload, headers, try_count) VALUES (?, ?, ?, ?, ?)', [
    request_type, endpoint, JSON.stringify(payload), JSON.stringify(headers), 0
  ]);
}
