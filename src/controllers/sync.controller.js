import axios from 'axios';
import db from '../services/db.service.js';
import config from '../config.js';



// --- CORE LOGIC: PUSH TO AIOSELL ---
export async function pushToAiosell(payload, type) {
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
export async function getOtaRoomCode(pmsRoomId) {
  const mapping = await db.query("SELECT ota_room_code FROM ota_room_mapping WHERE pms_room_id = ?", [pmsRoomId]);
  if (!mapping.length) throw new Error(`Mapping not found for Room ID ${pmsRoomId}`);
  return mapping[0].ota_room_code;
}

// --- PAYLOAD BUILDERS (Used by Worker) ---

export async function buildInventoryPayload(roomId, startDate, endDate, payloadJson) {
  const otaRoomCode = await getOtaRoomCode(roomId);
  const data = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return {
    updates: [{
      startDate,
      endDate,
      rooms: [{ roomCode: otaRoomCode, available: parseInt(data.availability) }]
    }]
  };
}

export async function buildRatesPayload(roomId, startDate, endDate, payloadJson) {
  const otaRoomCode = await getOtaRoomCode(roomId);
  const data = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return {
    updates: [{
      startDate,
      endDate,
      rooms: [{
        roomCode: otaRoomCode,
        price: parseFloat(data.price)
      }]
    }]
  };
}

export async function buildRestrictionsPayload(roomId, startDate, endDate, payloadJson) {
  const otaRoomCode = await getOtaRoomCode(roomId);
  const data = typeof payloadJson === 'string' ? JSON.parse(payloadJson) : payloadJson;
  return {
    updates: [{
      startDate,
      endDate,
      rooms: [{
        roomCode: otaRoomCode,
        stopSell: data.stopSell === true || data.stopSell === 'true',
        minStay: data.minStay ? parseInt(data.minStay) : undefined,
        maxStay: data.maxStay ? parseInt(data.maxStay) : undefined,
        closeOnArrival: data.closeOnArrival === true,
        closeOnDeparture: data.closeOnDeparture === true
      }]
    }]
  };
}