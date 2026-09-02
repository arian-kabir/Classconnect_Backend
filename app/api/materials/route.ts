import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

// Global in-memory DB for materials
const mockData = {
  total_materials: 2,
  sections: [
    {
      section_id: 1,
      section_code: "1",
      course_name: "System Analysis and Design",
      course_code: "CSE471",
      semester: "Summer",
      year: 2026,
      materials: [
        {
          note_id: 1,
          title: "Lecture 1: Introduction",
          uploader_name: "Dr. Sarah Chen",
          created_at: "2026-05-07T10:00:00Z",
          text_content: "Welcome to CSE471"
        },
        {
          note_id: 2,
          title: "Functional Requirements Draft",
          uploader_name: "Faria Fairooz",
          created_at: "2026-05-08T10:00:00Z",
          text_content: "Draft document for requirements."
        }
      ] as any[] // Use any array to allow pushing custom types easily
    }
  ]
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(mockData);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session?.user as any)?.role;
  if (role !== 'teacher' && role !== 'admin') {
    return NextResponse.json({ error: "Forbidden: Only teachers and admins can upload materials." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');
  const title = formData.get('title');
  const sectionId = parseInt(formData.get('section_id') as string);

  // Find the section to append to
  const section = mockData.sections.find(s => s.section_id === sectionId);
  if (!section) {
    return NextResponse.json({ error: "The specified section could not be found." }, { status: 400 });
  }

  section.materials.push({
    note_id: Date.now(),
    title: title as string,
    uploader_name: session?.user?.name || "Current User",
    created_at: new Date().toISOString(),
    text_content: `File: ${file ? (file as File).name : 'none'}`
  });
  mockData.total_materials++;

  return NextResponse.json({ success: true });
}
