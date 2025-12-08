import express from 'express';
import { handleChannelManagerBooking } from '../controllers/webhook.controller.js';

const router = express.Router();

// 1. Booking Notification (Aiosell -> PMS)
router.post('/reservation', handleChannelManagerBooking);

export default router;
