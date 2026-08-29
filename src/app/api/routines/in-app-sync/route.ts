/**
 * /api/routines/in-app-sync/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Bi-Directional Routine Intake & In-App Synchronization API.
 *
 * 1. POST   — Creates a new routine slot inside the web app, automatically
 *             upserts the local database (section_schedules & student routines fan-out),
 *             and appends the new row directly into the linked master Google Sheet.
 *
 * 2. GET    — Fetches all active master section schedules with course, teacher,
 *             and room details for the in-app ledger.
 *
 * 3. DELETE — Deletes a master schedule slot and cascades the removal from
 *             enrolled student routines.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from "next/server";
// @ts-ignore
import db from "@/lib/db/db";
import { appendSheetRow } from "@/lib/sheets";

// ── Helper DB Resolvers ───────────────────────────────────────────────────────

async function resolveOrCreateSection(
  courseCode: string,
  courseName: string | undefined,
  sectionCode: string
): Promise<number> {
  const cleanCode = courseCode.toUpperCase().trim();
  const cleanSec = sectionCode.trim();

  // 1. Try finding existing section
  const rows = await db.query(
    `SELECT s.section_id
     FROM sections s
     JOIN courses c ON s.course_id = c.course_id
     WHERE c.course_code = ? AND s.section_code = ?
     LIMIT 1`,
    [cleanCode, cleanSec]
  );

  if (rows.length > 0) {
    return (rows[0] as { section_id: number }).section_id;
  }

  // 2. Resolve or create course
  let courseId: number;
  const courseRows = await db.query(
    `SELECT course_id FROM courses WHERE course_code = ? LIMIT 1`,
    [cleanCode]
  );

  if (courseRows.length > 0) {
    courseId = (courseRows[0] as { course_id: number }).course_id;
  } else {
    const finalCourseName = courseName?.trim() || `${cleanCode}: Course`;
    const res: any = await db.query(
      `INSERT INTO courses (course_code, course_name, credits) VALUES (?, ?, 3)`,
      [cleanCode, finalCourseName]
    );
    courseId = res.insertId;
  }

  // 3. Create Section
  const currentYear = new Date().getFullYear();
  const secRes: any = await db.query(
    `INSERT INTO sections (course_id, section_code, semester, year, max_students)
     VALUES (?, ?, 'Summer', ?, 35)
     ON DUPLICATE KEY UPDATE semester = VALUES(semester)`,
    [courseId, cleanSec, currentYear]
  );

  const secRows = await db.query(
    `SELECT section_id FROM sections WHERE course_id = ? AND section_code = ? LIMIT 1`,
    [courseId, cleanSec]
  );
  const sectionId = secRows.length > 0 ? (secRows[0] as { section_id: number }).section_id : secRes.insertId;

  // 4. Auto-create Chat Room for section
  if (sectionId) {
    try {
      await db.query(
        `INSERT IGNORE INTO chat_rooms (section_id, room_name) VALUES (?, ?)`,
        [sectionId, `Chat - ${cleanCode} Section ${cleanSec}`]
      );
    } catch {}
  }

  return sectionId;
}

async function resolveOrCreateTeacher(initials: string): Promise<number | null> {
  const cleanInitials = initials.toUpperCase().trim();
  if (!cleanInitials) return null;

  const rows = await db.query(
    `SELECT user_id FROM users WHERE initials = ? AND role = 'teacher' LIMIT 1`,
    [cleanInitials]
  );

  if (rows.length > 0) {
    return (rows[0] as { user_id: number }).user_id;
  }

  const teacherEmail = `${cleanInitials.toLowerCase()}@university.edu`;
  const teacherName = `Faculty (${cleanInitials})`;
  try {
    const res: any = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, initials)
       VALUES (?, 'hashed_default_pwd', ?, 'teacher', ?)
       ON DUPLICATE KEY UPDATE initials = VALUES(initials)`,
      [teacherEmail, teacherName, cleanInitials]
    );
    const teacherRows = await db.query(
      `SELECT user_id FROM users WHERE initials = ? AND role = 'teacher' LIMIT 1`,
      [cleanInitials]
    );
    return teacherRows.length > 0 ? (teacherRows[0] as { user_id: number }).user_id : res.insertId;
  } catch {
    return null;
  }
}

async function getEnrolledStudents(sectionId: number): Promise<number[]> {
  const rows = await db.query(
    `SELECT student_id FROM section_enrollments WHERE section_id = ? AND status = 'active'`,
    [sectionId]
  );
  return (rows as { student_id: number }[]).map((r) => r.student_id);
}

// ── GET — List all master section schedules ───────────────────────────────────

export async function GET() {
  try {
    const schedules: any[] = await db.query(`
      SELECT 
        ss.schedule_id,
        ss.section_id,
        ss.day_of_week,
        ss.start_time,
        ss.end_time,
        ss.room_number,
        ss.last_synced_at,
        ss.spreadsheet_row_ref,
        c.course_id,
        c.course_code,
        c.course_name,
        s.section_code,
        s.semester,
        s.year,
        u.user_id AS teacher_id,
        u.full_name AS teacher_name,
        u.initials AS teacher_initials
      FROM section_schedules ss
      JOIN sections s ON ss.section_id = s.section_id
      JOIN courses c ON s.course_id = c.course_id
      LEFT JOIN users u ON ss.teacher_id = u.user_id
      ORDER BY 
        FIELD(ss.day_of_week, 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
        ss.start_time ASC,
        c.course_code ASC
    `);

    return NextResponse.json({
      success: true,
      total: schedules.length,
      schedules,
    });
  } catch (error: any) {
    console.error("[API_IN_APP_SYNC_GET] Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// ── POST — Add routine slot & sync to Google Sheet ───────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      spreadsheetId,
      sheetName = "Sheet1",
      courseCode,
      courseName,
      sectionCode,
      dayOfWeek,
      startTime,
      endTime,
      roomNumber,
      teacherInitials,
      syncToGoogleSheet = true,
    } = body;

    // Validation
    if (!courseCode || !sectionCode || !dayOfWeek || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Course code, section code, day, start time, and end time are required." },
        { status: 400 }
      );
    }

    const cleanCourseCode = courseCode.toUpperCase().trim();
    const cleanSectionCode = sectionCode.trim();
    const cleanRoom = roomNumber?.trim() || "TBA";
    const cleanTeacherInitials = teacherInitials ? teacherInitials.toUpperCase().trim() : "";

    // 1. Resolve DB records
    const sectionId = await resolveOrCreateSection(cleanCourseCode, courseName, cleanSectionCode);
    const teacherId = cleanTeacherInitials ? await resolveOrCreateTeacher(cleanTeacherInitials) : null;

    // 2. Format MySQL TIME strings (ensure HH:MM:00)
    const formattedStartTime = startTime.length === 5 ? `${startTime}:00` : startTime;
    const formattedEndTime = endTime.length === 5 ? `${endTime}:00` : endTime;

    // 3. Upsert into section_schedules (Master Schedule)
    const ssResult: any = await db.query(
      `INSERT INTO section_schedules
         (section_id, day_of_week, start_time, end_time, room_number, teacher_id, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         end_time       = VALUES(end_time),
         room_number    = VALUES(room_number),
         teacher_id     = VALUES(teacher_id),
         last_synced_at = NOW()`,
      [sectionId, dayOfWeek, formattedStartTime, formattedEndTime, cleanRoom, teacherId]
    );

    // 4. Fan-out to routines table for all enrolled students
    const enrolledStudents = await getEnrolledStudents(sectionId);
    for (const studentId of enrolledStudents) {
      await db.query(
        `INSERT INTO routines
           (user_id, section_id, day_of_week, start_time, end_time, room_number, source)
         VALUES (?, ?, ?, ?, ?, ?, 'manual')
         ON DUPLICATE KEY UPDATE
           end_time    = VALUES(end_time),
           room_number = VALUES(room_number),
           source      = 'manual'`,
        [studentId, sectionId, dayOfWeek, formattedStartTime, formattedEndTime, cleanRoom]
      );
    }

    // 5. Also fan-out to routines for the teacher if assigned
    if (teacherId) {
      await db.query(
        `INSERT INTO routines
           (user_id, section_id, day_of_week, start_time, end_time, room_number, source)
         VALUES (?, ?, ?, ?, ?, ?, 'manual')
         ON DUPLICATE KEY UPDATE
           end_time    = VALUES(end_time),
           room_number = VALUES(room_number),
           source      = 'manual'`,
        [teacherId, sectionId, dayOfWeek, formattedStartTime, formattedEndTime, cleanRoom]
      );
    }

    // 6. Optional: Sync to Google Sheet
    let sheetSyncResult: { ok: boolean; updatedRange?: string; error?: string } | null = null;
    if (syncToGoogleSheet && spreadsheetId) {
      // Format human-readable time range for sheet: e.g. "09:30-11:00"
      const sheetTime = `${startTime.substring(0, 5)}-${endTime.substring(0, 5)}`;
      const rowValues = [
        cleanCourseCode,
        cleanSectionCode,
        cleanRoom,
        dayOfWeek,
        sheetTime,
        cleanTeacherInitials,
      ];

      sheetSyncResult = await appendSheetRow(spreadsheetId, sheetName, rowValues);
    }

    // 7. Record intake log
    try {
      await db.query(
        `INSERT INTO routine_intake_log
           (spreadsheet_id, sheet_range, total_raw_rows, inserted, updated, skipped, warnings_count, errors_count, ran_at)
         VALUES (?, ?, 1, 1, 0, 0, 0, 0, NOW())`,
        [spreadsheetId || "IN_APP_ENTRY", `${sheetName}!A:F`]
      );
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: `Routine entry for ${cleanCourseCode} (Sec ${cleanSectionCode}) created and synced successfully!`,
        schedule: {
          sectionId,
          courseCode: cleanCourseCode,
          sectionCode: cleanSectionCode,
          dayOfWeek,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
          roomNumber: cleanRoom,
          teacherInitials: cleanTeacherInitials,
        },
        sheetSync: sheetSyncResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API_IN_APP_SYNC_POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create and sync routine entry" },
      { status: 500 }
    );
  }
}

// ── DELETE — Remove a master schedule slot ────────────────────────────────────

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scheduleIdParam = searchParams.get("scheduleId");

    if (!scheduleIdParam) {
      return NextResponse.json({ error: "scheduleId parameter is required" }, { status: 400 });
    }

    const scheduleId = parseInt(scheduleIdParam, 10);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: "Invalid scheduleId" }, { status: 400 });
    }

    // Find the schedule details before deleting to cascade delete from routines
    const rows = await db.query(
      `SELECT section_id, day_of_week, start_time FROM section_schedules WHERE schedule_id = ? LIMIT 1`,
      [scheduleId]
    );

    if (rows.length > 0) {
      const { section_id, day_of_week, start_time } = rows[0] as {
        section_id: number;
        day_of_week: string;
        start_time: string;
      };

      // Delete from section_schedules
      await db.query(`DELETE FROM section_schedules WHERE schedule_id = ?`, [scheduleId]);

      // Cascade remove from routines
      await db.query(
        `DELETE FROM routines WHERE section_id = ? AND day_of_week = ? AND start_time = ?`,
        [section_id, day_of_week, start_time]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Master schedule slot #${scheduleId} removed successfully.`,
    });
  } catch (error: any) {
    console.error("[API_IN_APP_SYNC_DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete schedule entry" }, { status: 500 });
  }
}
