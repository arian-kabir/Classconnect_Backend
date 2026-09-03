/**
 * app/api/routines/preview/route.ts
 *
 * GET /api/routines/preview?section_id=<id>
 *
 * Returns the master timeslots for a given section_id — these are the
 * slots seeded by Faria's M1.1 Spreadsheet Intake script.
 *
 * Purpose: powers the "Faria Sync Preview" UI in RoutineBuilder.tsx,
 * which shows students the exact class times they are about to enroll in
 * before they confirm — eliminating all manual time inputs from the student flow.
 *
 * RBAC: Any authenticated user can preview (read-only, no mutation).
 */

import { NextResponse }     from 'next/server';
import { getServerSession }  from 'next-auth';
import { authOptions }       from '../../auth/[...nextauth]/route';
import { db }                from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sectionIdStr = searchParams.get('section_id');

  if (!sectionIdStr || isNaN(parseInt(sectionIdStr, 10))) {
    return NextResponse.json({ error: 'Valid section_id is required.' }, { status: 400 });
  }

  const sectionId = parseInt(sectionIdStr, 10);

  try {
    const [slots] = await db.query<any[]>(`
      SELECT r.section_id, c.course_code, r.day_of_week, r.start_time, r.end_time, r.room_number, u.full_name as teacher_name
      FROM routines r
      JOIN sections s ON r.section_id = s.section_id
      JOIN courses c ON s.course_id = c.course_id
      LEFT JOIN users u ON s.teacher_id = u.user_id
      WHERE r.section_id = ?
    `, [sectionId]);

    return NextResponse.json({ slots, seeded: slots.length > 0 });
  } catch (error: any) {
    console.error('Preview DB Error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}
