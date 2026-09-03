import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role ?? 'student';
  const userId = Number((session.user as any).id);

  try {
    if (role === 'student') {
      // The Workspace Key (Student Lockout) - join on section_enrollments
      const [rows] = await db.query(`
        SELECT r.*, c.course_code, c.course_name, s.section_code
        FROM routines r
        JOIN sections s ON r.section_id = s.section_id
        JOIN courses c ON s.course_id = c.course_id
        JOIN section_enrollments se ON se.section_id = r.section_id
        WHERE se.student_id = ? AND se.status = 'active'
      `, [userId]);
      
      return NextResponse.json(rows);
    }

    // Teachers see their master slots
    const [rows] = await db.query(`
      SELECT r.*, c.course_code, c.course_name, s.section_code
      FROM routines r
      JOIN sections s ON r.section_id = s.section_id
      JOIN courses c ON s.course_id = c.course_id
      WHERE r.user_id = ?
    `, [userId]);

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error('GET Routines Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

interface PostBody {
  section_id: string | number;
  day_of_week?: string;
  start_time?: string;
  end_time?: string;
  room_number?: string;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role ?? 'student';
  const userId = Number((session.user as any).id);

  let body: PostBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sectionId = parseInt(String(body.section_id), 10);
  if (isNaN(sectionId)) {
    return NextResponse.json({ error: 'Valid section_id is required.' }, { status: 400 });
  }

  // === STUDENT PATH ===
  if (role === 'student') {
    // 1. The Admin Provisioning Lock (M1.1 Coherence)
    const [masterSlots] = await db.query<any[]>(`
      SELECT * FROM routines WHERE section_id = ?
    `, [sectionId]);

    if (masterSlots.length === 0) {
      return NextResponse.json(
        { error: 'Admin has not provisioned a time schedule for this section yet. Enrollment locked.' },
        { status: 403 }
      );
    }

    // 2. ACID Transaction for section_enrollments + Arian's Ring (M3.1)
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Check for duplicate enrollment (now handled by UNIQUE constraint, but we check to give nice error)
      const [existing] = await connection.query<any[]>(
        'SELECT 1 FROM section_enrollments WHERE student_id = ? AND section_id = ?',
        [userId, sectionId]
      );
      if (existing.length > 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'You are already enrolled in this section.' }, { status: 409 });
      }

      // Bind the student to the section
      await connection.query(
        'INSERT INTO section_enrollments (student_id, section_id, status) VALUES (?, ?, "active")',
        [userId, sectionId]
      );

      // Arian's Ring (M3.1) - Simultaneously insert into chat_room_members
      await connection.query(`
        INSERT INTO chat_room_members (room_id, user_id, role)
        SELECT room_id, ?, 'student' FROM chat_rooms WHERE section_id = ?
      `, [userId, sectionId]);

      await connection.commit();
      
      const successMsg = `Enrolled in Section ${sectionId} successfully!`;
      return NextResponse.json({ success: true, message: successMsg, routine: masterSlots[0] }, { status: 201 });
    } catch (err: any) {
      await connection.rollback();
      return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
      connection.release();
    }
  }

  // === TEACHER PATH ===
  if (role === 'teacher') {
    // Teachers are strictly blocked from adding/dropping sections in the routines table.
    return NextResponse.json({ error: 'Forbidden: Teachers cannot mutate the routines table directly.' }, { status: 403 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as any).role ?? 'student';
  const userId = Number((session.user as any).id);

  const { searchParams } = new URL(req.url);
  const routineId = parseInt(searchParams.get('routine_id') || '', 10);
  const sectionId = parseInt(searchParams.get('section_id') || '', 10);

  if (isNaN(sectionId)) {
    return NextResponse.json({ error: 'Valid section_id is required.' }, { status: 400 });
  }

  if (role === 'student') {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Remove enrollment
      await connection.query(
        'DELETE FROM section_enrollments WHERE student_id = ? AND section_id = ?',
        [userId, sectionId]
      );

      // Remove chat room membership
      await connection.query(`
        DELETE crm FROM chat_room_members crm
        JOIN chat_rooms cr ON crm.room_id = cr.room_id
        WHERE crm.user_id = ? AND cr.section_id = ?
      `, [userId, sectionId]);

      await connection.commit();
      return NextResponse.json({ success: true });
    } catch (err: any) {
      await connection.rollback();
      return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
      connection.release();
    }
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
