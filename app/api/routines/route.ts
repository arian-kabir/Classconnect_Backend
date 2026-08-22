import { NextResponse } from 'next/server';

export async function GET() {
  const routines = [
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
    }
  ];
  return NextResponse.json(routines);
}

export async function POST(req: Request) {
  // Mock adding a routine
  const body = await req.json();
  return NextResponse.json({ success: true, details: "Mock routine added!" });
}

export async function DELETE(req: Request) {
  return NextResponse.json({ success: true });
}
