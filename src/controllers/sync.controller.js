import axios from 'axios';
import db from '../services/db.service.js';
import config from '../config.js';

// --- SHARED HELPER: PUSH TO AIOSELL ---
async function pushToAiosell(payload, type) {
  // 1. GET CREDENTIALS
  const settings = await db.query("SELECT * FROM channel_settings WHERE channel = 'aiosell' LIMIT 1");
  if (!settings.length) throw new Error("Channel settings not found");
  const { api_user, api_pass } = settings[0];

  // 2. SEND TO AIOSELL
  const auth = Buffer.from(`${api_user}:${api_pass}`).toString('base64');
  const url = `${config.AIOS.baseUrl}/v2/cm/update/${api_user}`;

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15s timeout
    });
    return response.data;
  } catch (error) {
    // Enhance error message
    const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Aiosell API Error (${type}): ${msg}`);
  }
}

// --- HELPER: RESOLVE ROOM CODE ---
async function getOtaRoomCode(pmsRoomId) {
  const mapping = await db.query("SELECT ota_room_code FROM ota_room_mapping WHERE pms_room_id = ?", [pmsRoomId]);
  if (!mapping.length) throw new Error(`Mapping not found for Room ID ${pmsRoomId}`);
  return mapping[0].ota_room_code;
}

// --- 1. SYNC INVENTORY ---
export async function syncInventoryToAiosell(req, res) {
  try {
    const { roomId, startDate, endDate, availability } = req.body;
    const otaRoomCode = await getOtaRoomCode(roomId);

    const payload = {
      updates: [{
        startDate,
        endDate,
        rooms: [{ roomCode: otaRoomCode, available: parseInt(availability) }]
      }]
    };

    const result = await pushToAiosell(payload, 'Inventory');
    res.json({ success: true, data: result });

  } catch (error) {
    console.error("Sync Inventory Failed:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- 2. SYNC RATES ---
export async function syncRatesToAiosell(req, res) {
  try {
    const { roomId, startDate, endDate, price, ratePlanId } = req.body;
    const otaRoomCode = await getOtaRoomCode(roomId);

    // Optional: Map ratePlanId if you have multiple rate plans
    // const ratePlanCode = await getOtaRateCode(ratePlanId); 
    // For now, we assume default or send without ratePlanCode if Aiosell allows, 
    // OR you can pass ratePlanCode directly if your PMS knows it.

    const payload = {
      updates: [{
        startDate,
        endDate,
        rooms: [{
          roomCode: otaRoomCode,
          price: parseFloat(price)
          // ratePlanCode: "BAR" // Add this if needed
        }]
      }]
    };

    const result = await pushToAiosell(payload, 'Rates');
    res.json({ success: true, data: result });

  } catch (error) {
    console.error("Sync Rates Failed:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- 3. SYNC RESTRICTIONS ---
export async function syncRestrictionsToAiosell(req, res) {
  try {
    const { roomId, startDate, endDate, stopSell, minStay, maxStay, closeOnArrival, closeOnDeparture } = req.body;
    const otaRoomCode = await getOtaRoomCode(roomId);

    const payload = {
      updates: [{
        startDate,
        endDate,
        rooms: [{
          roomCode: otaRoomCode,
          stopSell: stopSell === true || stopSell === 'true',
          minStay: minStay ? parseInt(minStay) : undefined,
          maxStay: maxStay ? parseInt(maxStay) : undefined,
          closeOnArrival: closeOnArrival === true,
          closeOnDeparture: closeOnDeparture === true
        }]
      }]
    };

    const result = await pushToAiosell(payload, 'Restrictions');
    res.json({ success: true, data: result });

  } catch (error) {
    console.error("Sync Restrictions Failed:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}