CREATE TABLE IF NOT EXISTS ota_sync_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('INVENTORY', 'RATES', 'RESTRICTIONS') NOT NULL,
    room_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payload JSON NOT NULL,
    status ENUM('PENDING', 'PROCESSING', 'FAILED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    retry_count INT DEFAULT 0,
    error_message TEXT
);

-- Index for fast polling
CREATE INDEX idx_status_created ON ota_sync_queue(status, created_at);
