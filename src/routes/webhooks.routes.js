import express from 'express';
import { handleAiosellBooking } from '../controllers/webhook.controller.js';
const router = express.Router();


router.post('/aiosell/reservation', handleAiosellBooking);

export default router;
