import { NextResponse } from 'next/server';

interface FacultyMember {
  id: number;
  name: string;
  role: string;
}

const mockFacultyMembers: Record<string, FacultyMember[]> = {
  // Mock data mapping courseId to a list of faculty
  "1": [
    { id: 101, name: "Dr. Sarah Chen", role: "Course Coordinator" },
    { id: 102, name: "Prof. John Smith", role: "Lecturer" },
    { id: 103, name: "Dr. Alan Turing", role: "Guest Lecturer" },
  ],
  "default": [
    { id: 999, name: "Dr. Default Professor", role: "Lecturer" }
  ]
};

export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { courseId } = params;

    if (!courseId || isNaN(parseInt(courseId, 10))) {
      return NextResponse.json({ error: "Invalid courseId parameter" }, { status: 400 });
    }

    // Simulate DB query latency
    await new Promise(resolve => setTimeout(resolve, 300));

    // Fetch from mock DB or fallback to default
    const faculty = mockFacultyMembers[courseId] || mockFacultyMembers["default"];

    return NextResponse.json(faculty);
  } catch (error) {
    console.error("[GET /api/courses/[courseId]/faculty] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
