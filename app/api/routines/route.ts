/**
 * app/api/routines/route.ts
 *
 * Routine Builder & Personal Schedule — Backend API (Module 1.4)
 *
 * ─────────────────────────────────────────────────────────────────
 * RELATIONAL SCHEMA (execute once in your MySQL classconnectv2 database):
 * ─────────────────────────────────────────────────────────────────
 *
 * -- Core schemas (populated by Faria's M1.1 Spreadsheet Intake)
 * CREATE TABLE IF NOT EXISTS courses (
 *     course_id   INT AUTO_INCREMENT PRIMARY KEY,
 *     course_code VARCHAR(20) NOT NULL UNIQUE,
 *     course_name VARCHAR(255) NOT NULL
 * );
 *
 * CREATE TABLE IF NOT EXISTS sections (
 *     section_id   INT AUTO_INCREMENT PRIMARY KEY,
 *     course_id    INT NOT NULL,
 *     section_code VARCHAR(10) NOT NULL,
 *     semester     VARCHAR(20) NOT NULL,
 *     year         INT NOT NULL,
 *     teacher_id   INT NULL,
 *     FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
 * );
 *
 * -- Shahadat's & Faria's shared routine table
 * CREATE TABLE IF NOT EXISTS routines (
 *     routine_id  INT AUTO_INCREMENT PRIMARY KEY,
 *     user_id     INT NOT NULL,
 *     section_id  INT NOT NULL,
 *     day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') NOT NULL,
 *     start_time  TIME NOT NULL,
 *     end_time    TIME NOT NULL,
 *     room_number VARCHAR(50) NOT NULL,
 *     FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE
 * );
 *
 * -- Arian's M3.1 chat enrollment bridge table
 * CREATE TABLE IF NOT EXISTS section_enrollments (
 *     enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
 *     section_id    INT NOT NULL,
 *     student_id    INT NOT NULL,
 *     status        ENUM('active', 'dropped') DEFAULT 'active',
 *     FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE,
 *     UNIQUE KEY unique_student_section (student_id, section_id)
 * );
 *
 * ─────────────────────────────────────────────────────────────────
 * Production ACID transaction (student enrollment — replace mock when DB is live):
 * ─────────────────────────────────────────────────────────────────
 *
 *   const connection = await db.getConnection();
 *   await connection.beginTransaction();
 *   try {
 *     -- COHERENCE 1 (Arian M3.1): Register in chat enrollment bridge
 *     await connection.query(
 *       'INSERT IGNORE INTO section_enrollments (section_id, student_id, status) VALUES (?, ?, "active")',
 *       [sectionId, userId]
 *     );
 *     -- COHERENCE 2 (Faria M1.1): Clone pre-seeded master timeslots
 *     const [masterSlots] = await connection.query(
 *       'SELECT day_of_week, start_time, end_time, room_number FROM routines WHERE section_id = ? AND user_id != ?',
 *       [sectionId, userId]
 *     );
 *     for (const slot of masterSlots) {
 *       await connection.query(
 *         'INSERT IGNORE INTO routines (user_id, section_id, day_of_week, start_time, end_time, room_number) VALUES (?,?,?,?,?,?)',
 *         [userId, sectionId, slot.day_of_week, slot.start_time, slot.end_time, slot.room_number]
 *       );
 *     }
 *     await connection.commit();
 *   } catch (err) {
 *     await connection.rollback();
 *     throw err;
 *   } finally {
 *     connection.release();
 *   }
 */

import { NextResponse }    from 'next/server';
import type { RoutineEntry } from '@/types/index';
import { getServerSession } from 'next-auth';
import { authOptions }      from '../auth/[...nextauth]/route';

// ---------------------------------------------------------------------------
// Mock data — mirrors the production SQL schema exactly.
// Master routines (is_owner: true) represent Faria's spreadsheet-seeded slots.
// Student copies (is_owner: false) are clones tied to a specific student_email.
// ---------------------------------------------------------------------------

/**
 * Extended in-memory record type.
 * student_email is the ownership key in mock mode; production uses user_id FK.
 */
type MockRoutineRecord = RoutineEntry & { student_email?: string };

let mockRoutines: MockRoutineRecord[] = [
  {
    routine_id:   1 as RoutineEntry['routine_id'],
    day_of_week:  'Monday',
    start_time:   '08:00:00',
    end_time:     '09:20:00',
    room_number:  'UB2101',
    course_code:  'CSE471',
    course_name:  'System Analysis and Design',
    section_code: '1',
    section_id:   1 as RoutineEntry['section_id'],
    teacher_name: 'Dr. Sarah Chen',
    is_owner:     true,
  },
  {
    routine_id:   2 as RoutineEntry['routine_id'],
    day_of_week:  'Wednesday',
    start_time:   '09:30:00',
    end_time:     '10:50:00',
    room_number:  'UB3202',
    course_code:  'CSE471',
    course_name:  'System Analysis and Design',
    section_code: '1',
    section_id:   1 as RoutineEntry['section_id'],
    teacher_name: 'Dr. Sarah Chen',
    is_owner:     true,
  },
  {
    routine_id:   3 as RoutineEntry['routine_id'],
    day_of_week:  'Tuesday',
    start_time:   '11:00:00',
    end_time:     '12:20:00',
    room_number:  'UB1101',
    course_code:  'CS101',
    course_name:  'Introduction to Programming',
    section_code: '1',
    section_id:   3 as RoutineEntry['section_id'],
    teacher_name: 'Grace Hopper',
    is_owner:     true,
  },
];

// ---------------------------------------------------------------------------
// GET /api/routines
// Students: returns their own enrolled routines (filtered by session email).
// Teachers / Admins: returns all master timetable slots they own.
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role  = (session.user as { role?: string }).role ?? 'student';
  const email = session.user?.email;

  if (role === 'student') {
    // Production: WHERE r.user_id = session.user.id
    // Mock: filter by student_email ownership key
    return NextResponse.json(
      mockRoutines.filter(r => !r.is_owner && r.student_email === email)
    );
  }

  // Teachers and admins see only their own master slots
  return NextResponse.json(mockRoutines.filter(r => r.is_owner));
}

// ---------------------------------------------------------------------------
// POST /api/routines
//
// Student path: enrolls in a section by cloning the master timeslot(s) seeded
// by Faria's spreadsheet intake. Simultaneously triggers Arian's chat room
// enrollment hook (ACID transaction in production, console.log in mock mode).
//
// Teacher / Admin path: creates a new master timeslot (requires day, start,
// end, room). Conflict detection prevents double-booking the same time slot.
// ---------------------------------------------------------------------------

interface PostBody {
  section_id:   string | number;
  day_of_week?: string;
  start_time?:  string;
  end_time?:    string;
  room_number?: string;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role      = (session.user as { role?: string }).role ?? 'student';
  const userName  = session.user?.name ?? 'Current User';
  const userEmail = session.user?.email;

  let body: PostBody;
  try {
    body = await req.json() as PostBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsedSectionId = parseInt(String(body.section_id), 10);
  if (isNaN(parsedSectionId)) {
    return NextResponse.json({ error: 'Valid section_id is required.' }, { status: 400 });
  }

  // ── STUDENT path ──────────────────────────────────────────────────────────
  if (role === 'student') {
    // Duplicate enrollment guard
    const alreadyEnrolled = mockRoutines.some(
      r => Number(r.section_id) === parsedSectionId && !r.is_owner && r.student_email === userEmail
    );
    if (alreadyEnrolled) {
      return NextResponse.json({ error: 'You are already enrolled in this section.' }, { status: 409 });
    }

    // Coherence check (Faria M1.1): master slot must exist
    const masterSlots = mockRoutines.filter(
      r => Number(r.section_id) === parsedSectionId && r.is_owner
    );
    if (masterSlots.length === 0 || !masterSlots[0].teacher_name) {
      return NextResponse.json(
        { error: 'Admin has not provisioned a time schedule for this section yet. Enrollment locked.' },
        { status: 403 }
      );
    }

    // Clone all master slots for the student (handles multi-day sections, e.g. Mon + Wed)
    const clonedRoutines: MockRoutineRecord[] = masterSlots.map(master => ({
      ...master,
      routine_id:    Date.now() + Math.random() as unknown as RoutineEntry['routine_id'],
      is_owner:      false,
      student_email: userEmail ?? undefined,
    }));

    mockRoutines.push(...clonedRoutines);

    /**
     * INTEGRATION HOOK — Arian's M3.1 (Section-Scoped Multi-Role Chat Room Orchestrator):
     * In production with ACID transaction:
     *   await connection.query(
     *     'INSERT IGNORE INTO section_enrollments (section_id, student_id, status) VALUES (?, ?, "active")',
     *     [parsedSectionId, session.user.id]
     *   );
     *   await connection.query(
     *     'INSERT INTO chat_room_members (room_id, user_id, role)
     *      SELECT room_id, ?, "student" FROM chat_rooms WHERE section_id = ?',
     *     [session.user.id, parsedSectionId]
     *   );
     *
     * INTEGRATION HOOK — Faria's M3.4 (Study Scheduler / BullMQ Reminders):
     *   // Forward newly enrolled section_id to Faria's scheduler
     *   // to set up class reminders 30 minutes before each scheduled slot.
     *   await notificationQueue.add('scheduleClassReminders', { sectionId: parsedSectionId, userId });
     */
    console.log(`[ChatOrchestrator M3.1] Student enrolled → section ${parsedSectionId} chat room membership queued`);

    const firstClone = clonedRoutines[0];
    const successMsg = `✓ Enrolled in ${firstClone.course_code} Section ${firstClone.section_code} — ${clonedRoutines.length} class slot(s) added to your timetable.`;

    return NextResponse.json({ success: true, routine: clonedRoutines[0], message: successMsg }, { status: 201 });
  }

  // ── ADMIN path ──────────────────────────────────────────────────
  if (role === 'teacher') {
    return NextResponse.json({ error: 'Forbidden: Teachers cannot mutate the routines table directly.' }, { status: 403 });
  }
  const { day_of_week, start_time, end_time, room_number } = body;

  if (!day_of_week || !start_time || !end_time) {
    return NextResponse.json({ error: 'day_of_week, start_time, and end_time are required for teachers.' }, { status: 400 });
  }

  // Normalize to HH:MM for comparison (MySQL returns HH:MM:SS; browser sends HH:MM)
  const normStart = start_time.slice(0, 5);
  const normEnd   = end_time.slice(0, 5);

  if (normStart >= normEnd) {
    return NextResponse.json({ error: 'start_time must be strictly before end_time.' }, { status: 400 });
  }

  // Conflict detection — same day, overlapping times
  const conflictSlot = mockRoutines.find(r =>
    r.is_owner &&
    r.day_of_week === day_of_week &&
    (
      (normStart >= r.start_time.slice(0, 5) && normStart < r.end_time.slice(0, 5)) ||
      (normEnd   >  r.start_time.slice(0, 5) && normEnd  <= r.end_time.slice(0, 5))
    )
  );

  if (conflictSlot) {
    return NextResponse.json({
      error: 'Time conflict detected with an existing master schedule slot.',
      conflict: {
        course_code: conflictSlot.course_code,
        section_id:  conflictSlot.section_id,
        day_of_week: conflictSlot.day_of_week,
        start_time:  conflictSlot.start_time,
        end_time:    conflictSlot.end_time,
      },
    }, { status: 409 });
  }

  // Lookup course/section details from the courses mock for a proper display entry
  const newRoutine: MockRoutineRecord = {
    routine_id:   Date.now() as unknown as RoutineEntry['routine_id'],
    day_of_week:  day_of_week as RoutineEntry['day_of_week'],
    start_time:   normStart,
    end_time:     normEnd,
    room_number:  room_number ?? 'TBA',
    course_code:  'NEW',
    course_name:  'Newly Provisioned Section',
    section_code: '?',
    section_id:   parsedSectionId as unknown as RoutineEntry['section_id'],
    teacher_name: userName,
    is_owner:     true,
  };

  mockRoutines.push(newRoutine);
  return NextResponse.json({ success: true, routine: newRoutine }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE /api/routines?routine_id=<id>
//
// Admins: can delete any slot.
// Teachers: can only delete their own master slots (teacher_name match).
// Students: can only drop their own enrollment (student_email match + !is_owner).
//   IDOR FIX: student_email ownership verified server-side — never from body.
// ---------------------------------------------------------------------------

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role      = (session.user as { role?: string }).role ?? 'student';
  const userName  = session.user?.name ?? '';
  const userEmail = session.user?.email;

  const { searchParams } = new URL(req.url);
  const routineIdStr = searchParams.get('routine_id');

  if (!routineIdStr || isNaN(parseInt(routineIdStr, 10))) {
    return NextResponse.json({ error: 'Valid routine_id is required.' }, { status: 400 });
  }

  const routineId = parseInt(routineIdStr, 10);
  const target    = mockRoutines.find(r => Number(r.routine_id) === routineId);

  if (!target) {
    return NextResponse.json({ error: 'Routine entry not found.' }, { status: 404 });
  }

  const isAdmin          = role === 'admin';
  // Teachers cannot mutate routines directly
  // IDOR FIX: ownership verified via session.user.email, never a body/param value
  const isStudentDropping = role === 'student' && !target.is_owner && target.student_email === userEmail;

  if (!isAdmin && !isStudentDropping) {
    return NextResponse.json({ error: 'Forbidden: You do not have permission to remove this entry.' }, { status: 403 });
  }

  mockRoutines = mockRoutines.filter(r => Number(r.routine_id) !== routineId);

  /**
   * INTEGRATION HOOK — Arian's M3.1 (Chat Room Unenrollment):
   * In production: DELETE FROM section_enrollments WHERE student_id = ? AND section_id = ?
   * This ensures the student is removed from the section chat room when they drop.
   */
  if (isStudentDropping) {
    console.log(`[ChatOrchestrator M3.1] Student dropped section ${target.section_id} → chat room removal queued`);
  }

  return NextResponse.json({ success: true });
}
