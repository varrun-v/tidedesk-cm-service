import db from '../services/db.service.js';

export async function handleAiosellBooking(req, res) {
  const payload = req.body;
  
  // 1. LOG IT (Safety First)
  await db.query('INSERT INTO ota_webhook_logs (endpoint, body, response_status) VALUES (?, ?, ?)', 
    ['/webhook/aiosell', JSON.stringify(payload), 200]);

  try {
    const reservationId = payload.bookingId || payload.reservationId;
    const action = payload.action || 'book'; // 'book', 'modify', 'cancel'

    // 2. SAVE TO OTA_BOOKINGS (The Buffer)
    const existing = await db.query('SELECT id FROM ota_bookings WHERE reservation_id = ?', [reservationId]);
    
    const bookingData = [
        reservationId,
        payload.cmBookingId || null,
        'aiosell',
        payload.checkInDate,
        payload.checkOutDate,
        JSON.stringify(payload.guest || {}),
        JSON.stringify(payload.rooms || []),
        JSON.stringify(payload.priceBreakdown || {}),
        action,
        JSON.stringify(payload)
    ];

    if (existing.length > 0) {
        // UPDATE existing
        await db.query(`UPDATE ota_bookings SET cm_booking_id=?, channel=?, checkin=?, checkout=?, guest=?, rooms=?, price_breakdown=?, status=?, raw_payload=? WHERE reservation_id=?`, 
        [...bookingData.slice(1), reservationId]);
    } else {
        // INSERT new
        await db.query(`INSERT INTO ota_bookings (reservation_id, cm_booking_id, channel, checkin, checkout, guest, rooms, price_breakdown, status, raw_payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        bookingData);
    }

    // 3. CRITICAL: UPDATE LOCAL INVENTORY (Prevents Overbooking)
    // This function assumes you have an 'inventory' table in your PMS
    await updateLocalInventory(payload, action);

    // 4. Respond to Aiosell
    res.json({ success: true, message: 'Booking processed and inventory updated' });

  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// --- HELPER: LOGIC TO DEDUCT INVENTORY ---
async function updateLocalInventory(payload, action) {
    const rooms = payload.rooms || [];
    const checkIn = new Date(payload.checkInDate);
    const checkOut = new Date(payload.checkOutDate);

    // Loop through every night of the stay
    for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];

        for (const room of rooms) {
            // FIND THE INTERNAL PMS ROOM ID using the Mapping Table
            const mapping = await db.query('SELECT pms_room_id FROM ota_room_mapping WHERE ota_room_code = ?', [room.roomCode]);
            
            if (mapping.length > 0) {
                const pmsRoomId = mapping[0].pms_room_id;
                const quantity = 1; // Usually 1 per room object, check payload if 'count' exists

                if (action === 'book') {
                    // DEDUCT INVENTORY
                    // Assumes table: inventory (room_id, date, available_count)
                    await db.query('UPDATE inventory SET available_count = available_count - ? WHERE room_id = ? AND date = ?', 
                        [quantity, pmsRoomId, dateStr]);
                } 
                else if (action === 'cancel') {
                    // ADD INVENTORY BACK
                    await db.query('UPDATE inventory SET available_count = available_count + ? WHERE room_id = ? AND date = ?', 
                        [quantity, pmsRoomId, dateStr]);
                }
            }
        }
    }
}