import { NextResponse } from 'next/server';

const mockFacultyMembers = [
  { id: 101, name: "Dr. Sarah Chen", role: "Course Coordinator" },
  { id: 102, name: "Prof. John Smith", role: "Lecturer" },
];

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  // In a real application, we would query the database for all faculty
  // members assigned to sections of this specific courseId.
  return NextResponse.json(mockFacultyMembers);
}
