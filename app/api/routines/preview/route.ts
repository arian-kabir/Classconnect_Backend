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
import type { DayOfWeek }    from '@/types/index';

interface MasterTimeslot {
  section_id:   number;
  course_code:  string;
  day_of_week:  DayOfWeek;
  start_time:   string;
  end_time:     string;
  room_number:  string;
  teacher_name: string | null;
}

/**
 * Mock master schedule — same data as in routines/route.ts master slots.
 * Production: SELECT from routines WHERE section_id = ? AND user_id IS master/seed user.
 */
const MASTER_SCHEDULE: MasterTimeslot[] = [
  { section_id: 1, course_code: 'CSE471', day_of_week: 'Monday',    start_time: '08:00:00', end_time: '09:20:00', room_number: 'UB2101', teacher_name: 'Dr. Sarah Chen' },
  { section_id: 1, course_code: 'CSE471', day_of_week: 'Wednesday', start_time: '09:30:00', end_time: '10:50:00', room_number: 'UB3202', teacher_name: 'Dr. Sarah Chen' },
  { section_id: 2, course_code: 'CSE471', day_of_week: 'Sunday',    start_time: '12:00:00', end_time: '13:20:00', room_number: 'UB4101', teacher_name: 'Prof. Alan Turing' },
  { section_id: 3, course_code: 'CS101',  day_of_week: 'Tuesday',   start_time: '11:00:00', end_time: '12:20:00', room_number: 'UB1101', teacher_name: 'Grace Hopper' },
  { section_id: 3, course_code: 'CS101',  day_of_week: 'Thursday',  start_time: '11:00:00', end_time: '12:20:00', room_number: 'UB1101', teacher_name: 'Grace Hopper' },
];

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
  const slots = MASTER_SCHEDULE.filter(s => s.section_id === sectionId);

  // Simulate DB latency
  await new Promise(resolve => setTimeout(resolve, 200));

  return NextResponse.json({ slots, seeded: slots.length > 0 });
}
