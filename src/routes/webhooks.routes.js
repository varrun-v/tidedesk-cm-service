import express from 'express';
import { handleAiosellBooking, handleAiosellInventory, handleAiosellRates, handleAiosellInventoryRestrictions, handleAiosellRateRestrictions } from '../controllers/webhook.controller.js';
const router = express.Router();


router.post('/aiosell/reservation', handleAiosellBooking);
router.post('/aiosell/inventory', handleAiosellInventory);
router.post('/aiosell/rates', handleAiosellRates);
router.post('/aiosell/inventory-restrictions', handleAiosellInventoryRestrictions);
router.post('/aiosell/rate-restrictions', handleAiosellRateRestrictions);

export default router;
