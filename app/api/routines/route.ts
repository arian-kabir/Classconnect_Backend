import { NextResponse } from 'next/server';
import type { RoutineEntry } from '@/types';

// In-memory database for local testing
let mockRoutines: RoutineEntry[] = [
  {
    routine_id: 1,
    day_of_week: "Monday",
    start_time: "08:00:00",
    end_time: "09:20:00",
    room_number: "UB2101",
    course_code: "CSE471",
    course_name: "System Analysis and Design",
    section_code: "1",
    section_id: 1,
    teacher_name: "Dr. Sarah Chen",
    is_owner: true
  } as RoutineEntry
];

export async function GET() {
  return NextResponse.json(mockRoutines);
}

export async function POST(req: Request) {
  const body = await req.json();
  
  // Simulate backend logic inserting into DB
  const newRoutine: RoutineEntry = {
    routine_id: Date.now(), // Mock auto-increment ID
    day_of_week: body.day_of_week,
    start_time: body.start_time,
    end_time: body.end_time,
    room_number: body.room_number,
    course_code: "NEW", // Mock
    course_name: "Newly Added Course", // Mock
    section_code: "1", // Mock
    section_id: body.section_id,
    teacher_name: "Current User",
    is_owner: true
  };

  mockRoutines.push(newRoutine);

  return NextResponse.json({ success: true, routine: newRoutine });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const routineIdStr = searchParams.get('routine_id');
  if (routineIdStr) {
    mockRoutines = mockRoutines.filter(r => r.routine_id !== parseInt(routineIdStr));
  }
  return NextResponse.json({ success: true });
}
