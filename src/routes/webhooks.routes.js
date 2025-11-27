import express from 'express';
import { aiosellReservation } from '../controllers/webhook.controller.js';
const router = express.Router();

router.post('/aiosell/reservation', aiosellReservation);

export default router;
