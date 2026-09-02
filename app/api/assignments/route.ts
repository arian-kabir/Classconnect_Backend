import { NextResponse } from 'next/server';

const mockAssignments = [
  {
    id: 1,
    sectionId: 1,
    title: "Requirement Analysis Document",
    dueDate: "2026-06-15T23:59:00Z",
    submissionCount: 2,
    status: "active"
  },
  {
    id: 2,
    sectionId: 1,
    title: "Project Scope Presentation",
    dueDate: "2026-06-01T23:59:00Z",
    submissionCount: 40,
    status: "closed"
  }
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get('sectionId');
  
  if (sectionId) {
    return NextResponse.json(mockAssignments.filter(a => a.sectionId === parseInt(sectionId)));
  }
  return NextResponse.json(mockAssignments);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { sectionId, title, dueDate } = body;
  
  if (!sectionId || !title || !dueDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const newAssignment = {
    id: Date.now(),
    sectionId: parseInt(sectionId),
    title,
    dueDate,
    submissionCount: 0,
    status: "active"
  };

  mockAssignments.push(newAssignment);
  return NextResponse.json({ success: true, assignment: newAssignment });
}
