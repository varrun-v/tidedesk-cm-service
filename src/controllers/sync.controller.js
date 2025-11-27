import axios from 'axios';
import db from '../services/db.service.js';
import config from '../config.js';

export async function syncInventoryToAiosell(req, res) {
  // PHP sends: { "roomId": 15, "startDate": "2025-10-01", "endDate": "2025-10-02", "availability": 5 }
  const { roomId, startDate, endDate, availability } = req.body;

  try {
    // 1. GET CREDENTIALS
    const settings = await db.query("SELECT * FROM channel_settings WHERE channel = 'aiosell' LIMIT 1");
    if (!settings.length) throw new Error("Channel settings not found");
    const { api_user, api_pass, property_id } = settings[0];

    // 2. GET MAPPING (Convert PMS ID 15 -> 'DELUXE_SEA')
    const mapping = await db.query("SELECT ota_room_code FROM ota_room_mapping WHERE pms_room_id = ?", [roomId]);
    if (!mapping.length) throw new Error(`Mapping not found for Room ID ${roomId}`);
    const otaRoomCode = mapping[0].ota_room_code;

    // 3. PREPARE PAYLOAD
    const payload = {
        hotelCode: property_id,
        updates: [{
            startDate: startDate,
            endDate: endDate,
            rooms: [{ roomCode: otaRoomCode, available: parseInt(availability) }]
        }]
    };

    // 4. SEND TO AIOSELL
    const auth = Buffer.from(`${api_user}:${api_pass}`).toString('base64');
    const response = await axios.post(`${config.AIOS.baseUrl}/v2/cm/update/${api_user}`, payload, {
        headers: { 
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json' 
        }
    });

    res.json({ success: true, aiosell_response: response.data });

  } catch (error) {
    console.error("Sync Failed:", error.message);
    // OPTIONAL: Insert into retry_queue here if it fails
    res.status(500).json({ success: false, error: error.message });
  }
}