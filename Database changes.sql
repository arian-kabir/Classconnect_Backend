--sql additions
ALTER TABLE users
MODIFY password_hash VARCHAR(255) NULL;
-- Create allocations table (for staffing ledger)
CREATE TABLE IF NOT EXISTS `allocations` (
    `allocation_id` INT PRIMARY KEY AUTO_INCREMENT,
    `section_id` INT NOT NULL,
    `staff_id` INT NOT NULL,
    `role` ENUM('primary', 'assistant', 'lab_assistant') DEFAULT 'primary',
    `allocation_type` ENUM('teaching', 'lab', 'tutorial') DEFAULT 'teaching',
    `hours_per_week` DECIMAL(4,2) DEFAULT 3.00,
    `semester` VARCHAR(20) NOT NULL,
    `year` YEAR NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`section_id`) REFERENCES `sections`(`section_id`) ON DELETE CASCADE,
    FOREIGN KEY (`staff_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_allocation` (`section_id`, `staff_id`, `semester`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create staff_pool table (for staff management)
CREATE TABLE IF NOT EXISTS `staff_pool` (
    `staff_pool_id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `department_id` INT,
    `employment_type` ENUM('full_time', 'part_time', 'adjunct', 'tutor') DEFAULT 'full_time',
    `max_hours_per_week` DECIMAL(4,2) DEFAULT 20.00,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`department_id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_staff` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Update users with initials
UPDATE users SET initials = 'JD' WHERE user_id = 1;
UPDATE users SET initials = 'JS' WHERE user_id = 2;
UPDATE users SET initials = 'RW' WHERE user_id = 3;
UPDATE users SET initials = 'AJ' WHERE user_id = 4;
UPDATE users SET initials = 'SB' WHERE user_id = 5;
UPDATE users SET initials = 'MR' WHERE user_id = 6;
UPDATE users SET initials = 'RZ' WHERE user_id = 7;
UPDATE users SET initials = 'JD' WHERE user_id = 8;

-- Update sections with section_type
UPDATE sections SET section_type = 'lecture' WHERE section_id IN (1, 2, 3, 4, 5);
UPDATE sections SET section_type = 'lab' WHERE section_id = 6;

-- Delete all existing staff pools
DELETE FROM staff_pool WHERE user_id IN (1, 4, 9);
-- Insert into staff_pool
INSERT INTO staff_pool (user_id, department_id, employment_type, max_hours_per_week) VALUES
(1, 1, 'full_time', 18.00),  -- Department 1 = Computer Science
(4, 2, 'full_time', 20.00),  -- Department 2 = Mathematics
(9, 3, 'part_time', 15.00);  -- Department 3 = Physics

-- Delete all existing allocations
DELETE FROM allocations WHERE section_id IN (1,2,3, 4, 5,6);

-- Then run your insert
INSERT INTO allocations (section_id, staff_id, role, allocation_type, hours_per_week, semester, year) VALUES
(1, 3, 'primary', 'teaching', 3.00, 'Fall', 2026),
(2, 5, 'primary', 'teaching', 3.00, 'Fall', 2026),
(3, 3, 'primary', 'teaching', 3.00, 'Spring', 2026),
(4, 8, 'primary', 'teaching', 3.00, 'Fall', 2026),
(5, 5, 'primary', 'teaching', 3.00, 'Fall', 2026),
(6, 5, 'primary', 'teaching', 3.00, 'Spring', 2026);
-- Update routines with source
SET SQL_SAFE_UPDATES = 0;notes
UPDATE routines SET source = 'manual' WHERE routine_id IS NOT NULL;
INSERT INTO routines (user_id, section_id, day_of_week, start_time, end_time, room_number, source) VALUES
-- Student routines
(1, 1, 'Monday', '09:00:00', '10:30:00', 'Room 101', 'manual'),
(1, 3, 'Wednesday', '11:00:00', '12:30:00', 'Room 203', 'manual'),
(2, 1, 'Monday', '09:00:00', '10:30:00', 'Room 101', 'manual'),
(4, 3, 'Wednesday', '11:00:00', '12:30:00', 'Room 203', 'manual'),
(6, 4, 'Monday', '14:00:00', '15:30:00', 'Room 305', 'manual'),
-- Teacher routines
(3, 1, 'Monday', '09:00:00', '10:30:00', 'Room 101', 'manual'),
(3, 3, 'Wednesday', '11:00:00', '12:30:00', 'Room 203', 'manual'),
(5, 4, 'Thursday', '13:00:00', '14:30:00', 'Room 305', 'manual'),
(8, 4, 'Friday', '14:00:00', '15:30:00', 'Room 305', 'manual');

-- Insert sample notes for more users
INSERT INTO notes (title, content, text_content, user_id, section_id) VALUES
('John\'s Study Notes', '{"type":"excalidraw","elements":[]}', 'Key concepts from CS101', 1, 1),
('Jane\'s Assignment Notes', '{"type":"excalidraw","elements":[]}', 'Database design for CS301', 2, 4),
('Mike\'s Lab Notes', '{"type":"excalidraw","elements":[]}', 'Physics lab procedures', 6, 6);

-- Insert sample note shares
INSERT INTO note_shares (note_id, shared_with_user_id, permission) VALUES
(1, 2, 'view'),
(1, 4, 'view'),
(3, 7, 'view'),
(4, 1, 'edit');
