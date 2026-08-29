// migrate.js — Run DB schema migrations for Spreadsheet Routine Intake feature
const mysql = require('mysql2/promise');

// Load env from .env.local
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'classconnect_db',
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  console.log('Connected to DB. Running migrations...\n');

  // ── 1. Add initials column to users ─────────────────────────────────────
  try {
    await conn.query('ALTER TABLE `users` ADD COLUMN `initials` VARCHAR(10) DEFAULT NULL');
    console.log('[OK]   users.initials column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[SKIP] users.initials already exists');
    } else throw e;
  }

  // ── 2. Add source column to routines ─────────────────────────────────────
  try {
    await conn.query("ALTER TABLE `routines` ADD COLUMN `source` ENUM('manual','spreadsheet') DEFAULT 'manual'");
    console.log('[OK]   routines.source column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[SKIP] routines.source already exists');
    } else throw e;
  }

  // ── 3. Add spreadsheet_row_ref column to routines ─────────────────────────
  try {
    await conn.query('ALTER TABLE `routines` ADD COLUMN `spreadsheet_row_ref` INT DEFAULT NULL');
    console.log('[OK]   routines.spreadsheet_row_ref column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[SKIP] routines.spreadsheet_row_ref already exists');
    } else throw e;
  }

  // ── 4. Add unique key on routines for idempotent UPSERT ───────────────────
  try {
    await conn.query('ALTER TABLE `routines` ADD UNIQUE KEY `uq_user_section_day` (`user_id`, `section_id`, `day_of_week`)');
    console.log('[OK]   routines unique key (user_id, section_id, day_of_week) added');
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      console.log('[SKIP] routines unique key already exists');
    } else if (e.code === 'ER_DUP_ENTRY') {
      console.log('[WARN] Duplicate entries exist — unique key not added. Clean duplicates first.');
    } else throw e;
  }

  // ── 5. Create section_schedules master table ──────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`section_schedules\` (
      \`schedule_id\`         INT PRIMARY KEY AUTO_INCREMENT,
      \`section_id\`          INT NOT NULL,
      \`day_of_week\`         ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
      \`start_time\`          TIME NOT NULL,
      \`end_time\`            TIME NOT NULL,
      \`room_number\`         VARCHAR(30) DEFAULT 'TBA',
      \`teacher_id\`          INT DEFAULT NULL,
      \`spreadsheet_row_ref\` INT DEFAULT NULL,
      \`last_synced_at\`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      \`created_at\`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`section_id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`teacher_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE SET NULL,
      UNIQUE KEY \`uq_section_day_start\` (\`section_id\`, \`day_of_week\`, \`start_time\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   section_schedules table ready');

  // ── 6. Create routine_intake_log table ────────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`routine_intake_log\` (
      \`log_id\`          INT PRIMARY KEY AUTO_INCREMENT,
      \`spreadsheet_id\`  VARCHAR(255),
      \`sheet_range\`     VARCHAR(100),
      \`total_raw_rows\`  INT DEFAULT 0,
      \`inserted\`        INT DEFAULT 0,
      \`updated\`         INT DEFAULT 0,
      \`skipped\`         INT DEFAULT 0,
      \`warnings_count\`  INT DEFAULT 0,
      \`errors_count\`    INT DEFAULT 0,
      \`ran_at\`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   routine_intake_log table ready');

  // ── 7. Module 2: Expand users.role for student_tutor ────────────────────
  try {
    await conn.query(
      "ALTER TABLE `users` MODIFY COLUMN `role` ENUM('student', 'teacher', 'student_tutor', 'admin') DEFAULT 'student'"
    );
    console.log('[OK]   users.role updated to support student_tutor');
  } catch (e) {
    console.log('[WARN] users.role update notice:', e.message);
  }

  // ── 8. Module 2: Add section_type column to sections ──────────────────────
  try {
    await conn.query(
      "ALTER TABLE `sections` ADD COLUMN `section_type` ENUM('LECTURE', 'LAB', 'TUTORIAL', 'COMBINED') DEFAULT 'LECTURE'"
    );
    console.log('[OK]   sections.section_type column added');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('[SKIP] sections.section_type already exists');
    } else throw e;
  }

  // ── 9. Module 2: Create section_staff table ──────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`section_staff\` (
      \`allocation_id\` INT PRIMARY KEY AUTO_INCREMENT,
      \`section_id\`    INT NOT NULL,
      \`user_id\`       INT NOT NULL,
      \`role_type\`     ENUM('primary_instructor', 'teaching_assistant', 'lab_assistant', 'student_tutor') NOT NULL,
      \`assigned_at\`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`assigned_by\`   INT DEFAULT NULL,
      FOREIGN KEY (\`section_id\`) REFERENCES \`sections\`(\`section_id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
      UNIQUE KEY \`uq_section_user_role\` (\`section_id\`, \`user_id\`, \`role_type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   section_staff table ready');

  // ── 10. Module 2: Seed sample Student Tutors & Staff Allocations ─────────
  try {
    // Insert sample student tutors if they don't exist
    await conn.query(`
      INSERT INTO users (user_id, email, password_hash, full_name, role, initials) VALUES
      (9, 'alex.turner@university.edu', 'hashed_pwd_9', 'Alex Turner (TA)', 'student_tutor', 'AT'),
      (10, 'lisa.ann@university.edu', 'hashed_pwd_10', 'Lisa Ann (LA)', 'student_tutor', 'LA'),
      (11, 'kevin.park@university.edu', 'hashed_pwd_11', 'Kevin Park (Tutor)', 'student_tutor', 'KP')
      ON DUPLICATE KEY UPDATE role = 'student_tutor'
    `);
    console.log('[OK]   Sample student tutors seeded');

    // Populate initial section_staff from existing sections' primary instructors
    await conn.query(`
      INSERT IGNORE INTO section_staff (section_id, user_id, role_type)
      SELECT section_id, teacher_id, 'primary_instructor'
      FROM sections
      WHERE teacher_id IS NOT NULL
    `);

    // Assign sample TAs / LAs to sections 1, 2, 4
    await conn.query(`
      INSERT IGNORE INTO section_staff (section_id, user_id, role_type) VALUES
      (1, 9, 'teaching_assistant'),
      (1, 10, 'lab_assistant'),
      (2, 9, 'teaching_assistant'),
      (3, 11, 'student_tutor'),
      (4, 10, 'lab_assistant')
    `);
    console.log('[OK]   Sample section staffing allocations seeded');
  } catch (seedErr) {
    console.log('[WARN] Seed step notice:', seedErr.message);
  }

  // ── 11. Module 3: Create study_sessions table ─────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`study_sessions\` (
      \`session_id\`        INT PRIMARY KEY AUTO_INCREMENT,
      \`user_id\`           INT NOT NULL,
      \`course_id\`         INT DEFAULT NULL,
      \`title\`             VARCHAR(255) NOT NULL,
      \`description\`       TEXT DEFAULT NULL,
      \`day_of_week\`       ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
      \`start_time\`        TIME NOT NULL,
      \`end_time\`          TIME NOT NULL,
      \`session_date\`      DATE DEFAULT NULL,
      \`priority\`          ENUM('low','medium','high','urgent') DEFAULT 'medium',
      \`status\`            ENUM('scheduled','completed','skipped') DEFAULT 'scheduled',
      \`duration_minutes\`  INT DEFAULT 60,
      \`color_tag\`         VARCHAR(20) DEFAULT '#002626',
      \`created_at\`        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`course_id\`) REFERENCES \`courses\`(\`course_id\`) ON DELETE SET NULL,
      INDEX \`idx_user_day\` (\`user_id\`, \`day_of_week\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   study_sessions table ready');

  // ── 12. Module 3: Create reminders table ──────────────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`reminders\` (
      \`reminder_id\`        INT PRIMARY KEY AUTO_INCREMENT,
      \`user_id\`            INT NOT NULL,
      \`entity_type\`        ENUM('assignment','study_session','custom') NOT NULL,
      \`entity_id\`          INT DEFAULT NULL,
      \`title\`              VARCHAR(255) NOT NULL,
      \`message\`            TEXT DEFAULT NULL,
      \`due_at\`             DATETIME NOT NULL,
      \`alert_offset_hours\` INT DEFAULT 24,
      \`is_dismissed\`       BOOLEAN DEFAULT FALSE,
      \`is_read\`            BOOLEAN DEFAULT FALSE,
      \`created_at\`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
      INDEX \`idx_user_alerts\` (\`user_id\`, \`is_dismissed\`, \`due_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   reminders table ready');

  // ── 13. Module 3: Seed initial dynamic deadline reminders ────────────────
  try {
    // Seed dynamic reminders for upcoming assignment deadlines
    await conn.query(`
      INSERT IGNORE INTO reminders 
      (reminder_id, user_id, entity_type, entity_id, title, message, due_at, alert_offset_hours, is_dismissed)
      VALUES
      (1, 1, 'assignment', 1, 'CS101: Programming Assignment 1', 'Factorial calculation in Python due soon. Complete submission box review.', DATE_ADD(NOW(), INTERVAL 18 HOUR), 24, FALSE),
      (2, 1, 'assignment', 2, 'CSE471: Architecture Assignment 2', 'Complete System Analysis & Design module documentation.', DATE_ADD(NOW(), INTERVAL 42 HOUR), 48, FALSE)
    `);
    console.log('[OK]   Sample deadline reminders seeded');
  } catch (seedErr) {
    console.log('[WARN] Seed Module 3 notice:', seedErr.message);
  }

  // ── 14. Module 3: Email Template Engine Tables ─────────────────────────
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`email_templates\` (
      \`template_id\`        INT PRIMARY KEY AUTO_INCREMENT,
      \`category\`           ENUM('sickness_leave', 'quiz_makeup', 'consultation', 'assignment_extension', 'recommendation', 'custom') NOT NULL,
      \`title\`              VARCHAR(255) NOT NULL,
      \`description\`        TEXT NOT NULL,
      \`default_subject\`    VARCHAR(255) NOT NULL,
      \`body_template\`      TEXT NOT NULL,
      \`required_variables\` JSON NOT NULL,
      \`is_system\`          BOOLEAN DEFAULT TRUE,
      \`created_at\`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   email_templates table ready');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`email_logs\` (
      \`log_id\`          INT PRIMARY KEY AUTO_INCREMENT,
      \`user_id\`         INT NOT NULL,
      \`recipient_email\` VARCHAR(255) NOT NULL,
      \`recipient_name\`  VARCHAR(255) DEFAULT NULL,
      \`course_code\`     VARCHAR(50) DEFAULT NULL,
      \`subject\`         VARCHAR(255) NOT NULL,
      \`body_content\`    TEXT NOT NULL,
      \`category\`        VARCHAR(100) DEFAULT 'general',
      \`template_id\`     INT DEFAULT NULL,
      \`status\`          ENUM('sent', 'simulated', 'draft', 'failed') DEFAULT 'simulated',
      \`attachments\`     JSON DEFAULT NULL,
      \`error_message\`   TEXT DEFAULT NULL,
      \`sent_at\`         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`template_id\`) REFERENCES \`email_templates\`(\`template_id\`) ON DELETE SET NULL,
      INDEX \`idx_user_email_logs\` (\`user_id\`, \`sent_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   email_logs table ready');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`email_drafts\` (
      \`draft_id\`        INT PRIMARY KEY AUTO_INCREMENT,
      \`user_id\`         INT NOT NULL,
      \`template_id\`     INT DEFAULT NULL,
      \`recipient_email\` VARCHAR(255) DEFAULT NULL,
      \`subject\`         VARCHAR(255) DEFAULT NULL,
      \`form_data\`       JSON NOT NULL,
      \`attachments\`     JSON DEFAULT NULL,
      \`updated_at\`      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
      FOREIGN KEY (\`template_id\`) REFERENCES \`email_templates\`(\`template_id\`) ON DELETE SET NULL,
      INDEX \`idx_user_drafts\` (\`user_id\`, \`updated_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('[OK]   email_drafts table ready');

  // ── 15. Module 3: Seed Standard Academic Email Templates ─────────────────
  try {
    const templates = [
      {
        id: 1,
        category: 'sickness_leave',
        title: 'Sickness & Medical Leave Application',
        description: 'Formal application for absence due to illness, medical emergency, or hospitalization with attached doctor prescription or medical certificate.',
        default_subject: '[Leave Application] Absence from {{course_code}} (Sec {{section_number}}) due to Medical Illness - {{student_name}} (ID: {{student_id}})',
        body_template: `Dear {{recipient_title}} {{recipient_name}},

I am writing to formally notify you that I was unable to attend the {{course_code}} lecture/lab on {{missed_date}} due to sudden illness ({{illness_reason}}).

Details of Missed Session:
- Course: {{course_code}} — Section {{section_number}}
- Date of Absence: {{missed_date}}
- Missed Components: {{missed_components}}

I have attached my medical certificate / prescription ({{medical_doc_name}}) for your official verification. I have also consulted my peers regarding the covered materials and completed the required readings.

Kindly consider granting me attendance exemption for this session, and please let me know if any make-up task is required.

Thank you very much for your understanding and support.

Sincerely,
{{student_name}}
Student ID: {{student_id}}
Department: {{department}}
Email: {{student_email}}`,
        variables: JSON.stringify([
          { key: 'course_code', label: 'Course Code', type: 'select_course', required: true, default: 'CSE471' },
          { key: 'section_number', label: 'Section Number', type: 'text', required: true, default: '1' },
          { key: 'recipient_title', label: 'Recipient Title', type: 'select', options: ['Professor', 'Dr.', 'Mr.', 'Ms.'], required: true, default: 'Professor' },
          { key: 'recipient_name', label: 'Recipient Name', type: 'text', required: true, default: 'Sarah Chen' },
          { key: 'missed_date', label: 'Date of Absence', type: 'date', required: true, default: '2026-09-02' },
          { key: 'illness_reason', label: 'Illness / Medical Reason', type: 'text', required: true, default: 'Severe viral fever and migraine' },
          { key: 'missed_components', label: 'Missed Components', type: 'text', required: true, default: 'Lecture 12 on Architectural Patterns and in-class quiz' },
          { key: 'medical_doc_name', label: 'Medical Document Reference', type: 'text', required: false, default: 'Hospital_Slip_Sep2.pdf' },
          { key: 'student_name', label: 'Your Full Name', type: 'user_profile', required: true, default: 'Arian Kabir' },
          { key: 'student_id', label: 'Student ID', type: 'user_profile', required: true, default: '23201295' },
          { key: 'department', label: 'Department', type: 'text', required: true, default: 'Computer Science & Engineering' },
          { key: 'student_email', label: 'Student Email', type: 'user_profile', required: true, default: 'arian.kabir@university.edu' }
        ])
      },
      {
        id: 2,
        category: 'quiz_makeup',
        title: 'Cross-Section Quiz / Make-up Request',
        description: 'Request to sit for a quiz or exam with an alternate section due to unavoidable university schedule collisions or emergencies.',
        default_subject: '[Make-up Request] Permission to attend Cross-Section Quiz for {{course_code}} - {{student_name}} (ID: {{student_id}})',
        body_template: `Dear {{recipient_title}} {{recipient_name}},

I am currently enrolled in {{course_code}}, Section {{section_number}}. I am writing to respectfully request permission to sit for {{quiz_title}} with an alternate section due to an unavoidable conflict: {{conflict_reason}}.

Proposed Arrangement:
- Current Section: Section {{section_number}} (Scheduled: {{original_schedule}})
- Requested Alternate Section: Section {{target_section}} (Scheduled: {{target_schedule}})
- Specific Assessment: {{quiz_title}}

I have attached supporting documentation ({{supporting_doc_name}}) confirming the timing conflict. I have coordinated with the respective proctors/TAs and will abide by all academic integrity regulations.

I would be extremely grateful if you could approve my attendance for this alternative slot.

Sincerely,
{{student_name}}
Student ID: {{student_id}}
Section: {{section_number}}
Contact: {{student_email}}`,
        variables: JSON.stringify([
          { key: 'course_code', label: 'Course Code', type: 'select_course', required: true, default: 'CS101' },
          { key: 'section_number', label: 'Your Section', type: 'text', required: true, default: '2' },
          { key: 'recipient_title', label: 'Recipient Title', type: 'select', options: ['Professor', 'Dr.', 'Mr.', 'Ms.'], required: true, default: 'Dr.' },
          { key: 'recipient_name', label: 'Recipient Name', type: 'text', required: true, default: 'Alex Turner' },
          { key: 'quiz_title', label: 'Quiz / Exam Name', type: 'text', required: true, default: 'Quiz 2 (Data Structures)' },
          { key: 'conflict_reason', label: 'Conflict Reason', type: 'text', required: true, default: 'Midterm lab exam collision with MAT202 at the same hour' },
          { key: 'original_schedule', label: 'Original Schedule', type: 'text', required: true, default: 'Tuesday 09:00 - 10:30' },
          { key: 'target_section', label: 'Target Section', type: 'text', required: true, default: 'Section 4' },
          { key: 'target_schedule', label: 'Target Schedule', type: 'text', required: true, default: 'Thursday 11:00 - 12:30' },
          { key: 'supporting_doc_name', label: 'Supporting Doc', type: 'text', required: false, default: 'Exam_Collision_Proof.pdf' },
          { key: 'student_name', label: 'Your Full Name', type: 'user_profile', required: true, default: 'Arian Kabir' },
          { key: 'student_id', label: 'Student ID', type: 'user_profile', required: true, default: '23201295' },
          { key: 'student_email', label: 'Student Email', type: 'user_profile', required: true, default: 'arian.kabir@university.edu' }
        ])
      },
      {
        id: 3,
        category: 'consultation',
        title: 'Faculty Consultation Slot Booking',
        description: 'Schedule an in-person or online consultation session during designated office hours to discuss coursework or project concepts.',
        default_subject: '[Consultation Request] Office Hours Appointment regarding {{course_code}} - {{student_name}} (ID: {{student_id}})',
        body_template: `Dear {{recipient_title}} {{recipient_name}},

I hope this email finds you well. I am a student in your {{course_code}} (Section {{section_number}}) class.

I would like to request a 15-20 minute consultation during your office hours to discuss the following topic(s):
{{discussion_topics}}

Preferred Consultation Windows:
1. {{preferred_slot_1}}
2. {{preferred_slot_2}}
3. Meeting Mode: {{meeting_mode}} (In-Person Office / Online Google Meet)

Please let me know which slot suits your availability best, or propose an alternative time. Thank you for your time and guidance.

Best regards,
{{student_name}}
Student ID: {{student_id}}
Course: {{course_code}} (Sec {{section_number}})
Email: {{student_email}}`,
        variables: JSON.stringify([
          { key: 'course_code', label: 'Course Code', type: 'select_course', required: true, default: 'CSE471' },
          { key: 'section_number', label: 'Section Number', type: 'text', required: true, default: '1' },
          { key: 'recipient_title', label: 'Recipient Title', type: 'select', options: ['Professor', 'Dr.', 'Mr.', 'Ms.'], required: true, default: 'Professor' },
          { key: 'recipient_name', label: 'Recipient Name', type: 'text', required: true, default: 'Sarah Chen' },
          { key: 'discussion_topics', label: 'Discussion Topics', type: 'textarea', required: true, default: 'Clarification on Module 3 System Architecture diagrams and relational integrity constraints' },
          { key: 'preferred_slot_1', label: 'Preferred Slot 1', type: 'text', required: true, default: 'Monday 02:00 PM - 02:30 PM' },
          { key: 'preferred_slot_2', label: 'Preferred Slot 2', type: 'text', required: true, default: 'Wednesday 11:30 AM - 12:00 PM' },
          { key: 'meeting_mode', label: 'Meeting Mode', type: 'select', options: ['In-Person (Faculty Office)', 'Online (Google Meet)', 'Either'], required: true, default: 'In-Person (Faculty Office)' },
          { key: 'student_name', label: 'Your Full Name', type: 'user_profile', required: true, default: 'Arian Kabir' },
          { key: 'student_id', label: 'Student ID', type: 'user_profile', required: true, default: '23201295' },
          { key: 'student_email', label: 'Student Email', type: 'user_profile', required: true, default: 'arian.kabir@university.edu' }
        ])
      },
      {
        id: 4,
        category: 'assignment_extension',
        title: 'Assignment Extension / Regrade Request',
        description: 'Formal appeal for a brief deadline extension or request for rubric clarification and grading review.',
        default_subject: '[Assignment Query] Request regarding {{assignment_name}} for {{course_code}} - {{student_name}} (ID: {{student_id}})',
        body_template: `Dear {{recipient_title}} {{recipient_name}},

I am writing to you regarding {{assignment_name}} in {{course_code}} (Section {{section_number}}).

Request Type: {{request_type}}
Reason / Justification:
{{justification}}

Current Status:
- Original Deadline: {{original_deadline}}
- Requested Extension Until: {{requested_deadline}}
- Work Progress: {{work_progress_summary}}

I have attached my current draft / work-in-progress ({{draft_file_name}}) to demonstrate my earnest effort thus far.

Thank you very much for considering my request.

Warm regards,
{{student_name}}
Student ID: {{student_id}}
Email: {{student_email}}`,
        variables: JSON.stringify([
          { key: 'course_code', label: 'Course Code', type: 'select_course', required: true, default: 'MAT202' },
          { key: 'section_number', label: 'Section Number', type: 'text', required: true, default: '1' },
          { key: 'recipient_title', label: 'Recipient Title', type: 'select', options: ['Professor', 'Dr.', 'Mr.', 'Ms.'], required: true, default: 'Dr.' },
          { key: 'recipient_name', label: 'Recipient Name', type: 'text', required: true, default: 'Lisa Ann' },
          { key: 'assignment_name', label: 'Assignment Name', type: 'text', required: true, default: 'Assignment 3: Differential Equations' },
          { key: 'request_type', label: 'Request Type', type: 'select', options: ['24-Hour Extension Request', '48-Hour Extension Request', 'Grading Rubric Review Request'], required: true, default: '24-Hour Extension Request' },
          { key: 'justification', label: 'Justification', type: 'textarea', required: true, default: 'Facing unforeseen technical hardware issues with simulation software and need additional time to verify computations.' },
          { key: 'original_deadline', label: 'Original Deadline', type: 'text', required: true, default: 'Friday 11:59 PM' },
          { key: 'requested_deadline', label: 'Requested Extension', type: 'text', required: true, default: 'Saturday 11:59 PM' },
          { key: 'work_progress_summary', label: 'Progress Summary', type: 'text', required: true, default: '80% complete; problem sets 1 to 4 solved with full calculations.' },
          { key: 'draft_file_name', label: 'Draft Attachment Name', type: 'text', required: false, default: 'MAT202_Draft_Work.pdf' },
          { key: 'student_name', label: 'Your Full Name', type: 'user_profile', required: true, default: 'Arian Kabir' },
          { key: 'student_id', label: 'Student ID', type: 'user_profile', required: true, default: '23201295' },
          { key: 'student_email', label: 'Student Email', type: 'user_profile', required: true, default: 'arian.kabir@university.edu' }
        ])
      },
      {
        id: 5,
        category: 'recommendation',
        title: 'Recommendation Letter / Reference Request',
        description: 'Polite inquiry asking a professor for an academic recommendation letter for graduate school or scholarship applications.',
        default_subject: '[Recommendation Request] Academic Reference for {{program_or_scholarship}} - {{student_name}} (ID: {{student_id}})',
        body_template: `Dear {{recipient_title}} {{recipient_name}},

I hope you are having a productive semester. I am {{student_name}} (ID: {{student_id}}), and I had the privilege of taking {{course_code}} under your instruction during {{semester_taken}}, in which I achieved a grade of {{achieved_grade}}.

I am currently preparing my application for {{program_or_scholarship}} at {{institution_name}} (Submission Deadline: {{application_deadline}}). Given my keen interest in {{area_of_interest}} and the foundational knowledge I gained in your course, I would be deeply honored if you would consider writing a letter of recommendation on my behalf.

To assist you with the reference, I have attached:
1. My updated Resume / Curriculum Vitae
2. Unofficial Academic Transcript
3. Statement of Purpose Draft

Please let me know if you would be willing to support my candidacy or if you need any additional information. Thank you so much for your mentorship.

Respectfully yours,
{{student_name}}
Student ID: {{student_id}}
Department: {{department}}
Contact: {{student_email}}`,
        variables: JSON.stringify([
          { key: 'course_code', label: 'Course Code', type: 'select_course', required: true, default: 'CSE471' },
          { key: 'recipient_title', label: 'Recipient Title', type: 'select', options: ['Professor', 'Dr.', 'Mr.', 'Ms.'], required: true, default: 'Professor' },
          { key: 'recipient_name', label: 'Recipient Name', type: 'text', required: true, default: 'Sarah Chen' },
          { key: 'semester_taken', label: 'Semester Taken', type: 'text', required: true, default: 'Spring 2026' },
          { key: 'achieved_grade', label: 'Achieved Grade', type: 'text', required: true, default: 'A (4.00)' },
          { key: 'program_or_scholarship', label: 'Target Program / Award', type: 'text', required: true, default: 'M.Sc. in Computer Science & AI' },
          { key: 'institution_name', label: 'Target University / Org', type: 'text', required: true, default: 'National University of Singapore' },
          { key: 'application_deadline', label: 'Application Deadline', type: 'text', required: true, default: 'October 15, 2026' },
          { key: 'area_of_interest', label: 'Area of Interest', type: 'text', required: true, default: 'Distributed Systems & Cloud Computing' },
          { key: 'student_name', label: 'Your Full Name', type: 'user_profile', required: true, default: 'Arian Kabir' },
          { key: 'student_id', label: 'Student ID', type: 'user_profile', required: true, default: '23201295' },
          { key: 'department', label: 'Department', type: 'text', required: true, default: 'Computer Science & Engineering' },
          { key: 'student_email', label: 'Student Email', type: 'user_profile', required: true, default: 'arian.kabir@university.edu' }
        ])
      },
      {
        id: 6,
        category: 'custom',
        title: 'General Academic Inquiry & Custom Template',
        description: 'Standard university academic format for general queries, grade queries, or curriculum clarifications.',
        default_subject: '[Academic Query] {{query_topic}} - {{course_code}} (Sec {{section_number}}) - {{student_name}}',
        body_template: `Dear {{recipient_title}} {{recipient_name}},

I hope you are doing well. I am writing to inquire regarding {{query_topic}} in our {{course_code}} (Section {{section_number}}) class.

Inquiry Details:
{{inquiry_body}}

Thank you for your time and guidance.

Sincerely,
{{student_name}}
Student ID: {{student_id}}
Email: {{student_email}}`,
        variables: JSON.stringify([
          { key: 'course_code', label: 'Course Code', type: 'select_course', required: true, default: 'CS101' },
          { key: 'section_number', label: 'Section Number', type: 'text', required: true, default: '1' },
          { key: 'recipient_title', label: 'Recipient Title', type: 'select', options: ['Professor', 'Dr.', 'Mr.', 'Ms.'], required: true, default: 'Professor' },
          { key: 'recipient_name', label: 'Recipient Name', type: 'text', required: true, default: 'Sarah Chen' },
          { key: 'query_topic', label: 'Subject Topic', type: 'text', required: true, default: 'Lab Schedule Clarification' },
          { key: 'inquiry_body', label: 'Inquiry Content', type: 'textarea', required: true, default: 'Could you please confirm whether the upcoming Lab 4 session will take place in Room 402 or the main computer laboratory?' },
          { key: 'student_name', label: 'Your Full Name', type: 'user_profile', required: true, default: 'Arian Kabir' },
          { key: 'student_id', label: 'Student ID', type: 'user_profile', required: true, default: '23201295' },
          { key: 'student_email', label: 'Student Email', type: 'user_profile', required: true, default: 'arian.kabir@university.edu' }
        ])
      }
    ];

    for (const t of templates) {
      await conn.query(
        `INSERT INTO email_templates (template_id, category, title, description, default_subject, body_template, required_variables, is_system)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE 
           title = VALUES(title),
           description = VALUES(description),
           default_subject = VALUES(default_subject),
           body_template = VALUES(body_template),
           required_variables = VALUES(required_variables)`,
        [t.id, t.category, t.title, t.description, t.default_subject, t.body_template, t.variables]
      );
    }
    console.log('[OK]   Standard Academic Email Templates seeded');

    // Seed sample email logs for demo
    await conn.query(`
      INSERT IGNORE INTO email_logs 
      (log_id, user_id, recipient_email, recipient_name, course_code, subject, body_content, category, template_id, status, attachments)
      VALUES
      (1, 1, 'sarah.chen@university.edu', 'Dr. Sarah Chen', 'CSE471', '[Leave Application] Absence from CSE471 (Sec 1) due to Medical Illness - Arian Kabir (ID: 23201295)', 'Dear Dr. Sarah Chen, I was unable to attend on Sep 2 due to severe migraine. Medical certificate attached.', 'sickness_leave', 1, 'sent', '["Prescription_Sep2.pdf"]'),
      (2, 1, 'alex.turner@university.edu', 'Alex Turner (TA)', 'CS101', '[Make-up Request] Permission to attend Cross-Section Quiz for CS101 - Arian Kabir (ID: 23201295)', 'Dear Alex Turner, Requesting permission to sit for Quiz 2 in Section 4 due to MAT202 exam collision.', 'quiz_makeup', 2, 'simulated', '["Exam_Collision_Proof.pdf"]')
    `);
    console.log('[OK]   Sample email audit logs seeded');
  } catch (seedErr) {
    console.log('[WARN] Email Template seed notice:', seedErr.message);
  }

  await conn.end();
  console.log('\\n✅ All migrations complete.');
}

migrate().catch((e) => {
  console.error('\\n❌ Migration FAILED:', e.message);
  process.exit(1);
});

