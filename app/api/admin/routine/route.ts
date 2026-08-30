import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [routines]: any = await db.query(
      'SELECT course_sec, day, time, room FROM course_routines'
    );
    
    // Fetch Lecturer Assignments
    const [lecturers]: any = await db.query(
      'SELECT id, initials, course_sec AS courseSec FROM course_assignments'
    );

    // Fetch Student Assignments
    const [students]: any = await db.query(
      'SELECT id, student_id AS studentId, course_sec AS courseSec, seats_remaining AS seatsRemaining FROM student_assignments'
    );

    return NextResponse.json({
      success: true,
      routines,
      lecturers,
      students,
    });
  } catch (error) {
    console.error('Database Fetch Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Assign Lecturer
    if (body.type === 'ASSIGN_LECTURER') {
      const { initials, course_sec } = body;
      if (!initials || !course_sec) {
        return NextResponse.json(
          { success: false, error: 'Missing initials or course_sec' },
          { status: 400 }
        );
      }

      await db.query(
        `INSERT INTO course_assignments (initials, course_sec) 
         VALUES (?, ?)`,
        [initials, course_sec]
      );

      return NextResponse.json({ success: true, message: 'Lecturer assigned successfully' });
    }

    // 2. Assign Student
    if (body.type === 'ASSIGN_STUDENT') {
      const student_id = body.student_id || body.studentId;
      const course_sec = body.course_sec || body.courseSec;
      const seats_remaining = body.seats_remaining ?? body.seatsRemaining ?? 0;

      if (!student_id || !course_sec) {
        return NextResponse.json(
          { success: false, error: 'Missing student_id or course_sec' },
          { status: 400 }
        );
      }

      await db.query(
        `INSERT INTO student_assignments (student_id, course_sec, seats_remaining) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
           seats_remaining = VALUES(seats_remaining)`,
        [student_id, course_sec, seats_remaining]
      );

      return NextResponse.json({ success: true, message: 'Student assigned successfully' });
    }

    // 3. Update Weekly Routine Slots
    const course_sec = body.course_sec || body.courseSec;
    const slots = body.slots;

    if (!course_sec || !Array.isArray(slots)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload for routine update' },
        { status: 400 }
      );
    }

    await db.query('DELETE FROM course_routines WHERE course_sec = ?', [course_sec]);

    for (const slot of slots) {
      if (slot.time || slot.room) {
        await db.query(
          'INSERT INTO course_routines (course_sec, day, time, room) VALUES (?, ?, ?, ?)',
          [course_sec, slot.day, slot.time || '', slot.room || '']
        );
      }
    }

    return NextResponse.json({ success: true, message: 'Routine updated successfully' });
  } catch (error) {
    console.error('Database Save Error Details:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}