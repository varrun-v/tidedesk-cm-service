import express from 'express';
import bodyParser from 'body-parser';
import config from './config.js';
import { handleAiosellBooking } from './controllers/webhook.controller.js';
import { syncInventoryToAiosell } from './controllers/sync.controller.js';

const app = express();
app.use(bodyParser.json());

// 1. Webhook for Aiosell (The URL you give them)
app.post('/webhook/aiosell', handleAiosellBooking);

// 2. Sync Endpoint for your PHP PMS (Protected by Key)
app.post('/sync/inventory', (req, res, next) => {
    if (req.headers['x-api-key'] !== config.INTERNAL_API_KEY) return res.sendStatus(403);
    next();
}, syncInventoryToAiosell);

// 3. Health Check
app.get('/', (req, res) => res.send('PMS Channel Manager Microservice is Running 🚀'));

app.listen(config.PORT, () => {
  console.log(`Microservice running on port ${config.PORT}`);
});