import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ledger: [
      { id: 1, course_code: 'CSE471', section_id: 1, teacher_name: 'Dr. Sarah Chen', status: 'Assigned' }
    ]
  });
}
