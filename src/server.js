import express from 'express';
import bodyParser from 'body-parser';
import config from './config.js';
import webhookRoutes from './routes/webhooks.routes.js';

const app = express();
app.use(bodyParser.json());

// 1. Webhook for Aiosell (The URL you give them)
app.use('/webhooks', webhookRoutes);

// 2. Sync Endpoints (REMOVED: Now using Polling Architecture via ota_sync_queue)
// app.post('/sync/inventory', checkApiKey, syncInventoryToAiosell);
// app.post('/sync/rates', checkApiKey, syncRatesToAiosell);
// app.post('/sync/restrictions', checkApiKey, syncRestrictionsToAiosell);

// 3. Health Check
app.get('/', (req, res) => res.send('PMS Channel Manager Microservice is Running 🚀'));

app.listen(config.PORT, () => {
  console.log(`Microservice running on port ${config.PORT}`);
});