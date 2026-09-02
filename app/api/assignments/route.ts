import { NextResponse } from 'next/server';

interface Assignment {
  id: number;
  sectionId: number;
  title: string;
  dueDate: string;
  submissionCount: number;
  status: "active" | "closed";
}

// In-memory mock database for assignments
const mockAssignments: Assignment[] = [
  {
    id: 1,
    sectionId: 1,
    title: "Requirement Analysis Document",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
    submissionCount: 2,
    status: "active"
  },
  {
    id: 2,
    sectionId: 1,
    title: "Project Scope Presentation",
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    submissionCount: 40,
    status: "closed"
  }
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId');
    
    // Simulate database latency
    await new Promise(resolve => setTimeout(resolve, 400));
    
    if (sectionId) {
      const parsedId = parseInt(sectionId, 10);
      if (isNaN(parsedId)) {
        return NextResponse.json({ error: "Invalid sectionId parameter" }, { status: 400 });
      }
      return NextResponse.json(mockAssignments.filter(a => a.sectionId === parsedId));
    }
    
    return NextResponse.json(mockAssignments);
  } catch (error) {
    console.error("[GET /api/assignments] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sectionId, title, dueDate } = body;
    
    // Strict Input Validation
    if (!sectionId || typeof sectionId !== 'number') {
      return NextResponse.json({ error: "Valid sectionId is required" }, { status: 400 });
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: "Valid title is required" }, { status: 400 });
    }
    if (!dueDate || isNaN(Date.parse(dueDate))) {
      return NextResponse.json({ error: "Valid ISO dueDate is required" }, { status: 400 });
    }

    // Simulate database latency
    await new Promise(resolve => setTimeout(resolve, 600));

    const newAssignment: Assignment = {
      id: Date.now(),
      sectionId,
      title: title.trim(),
      dueDate,
      submissionCount: 0,
      status: "active"
    };

    mockAssignments.push(newAssignment);
    
    return NextResponse.json({ success: true, assignment: newAssignment }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/assignments] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
