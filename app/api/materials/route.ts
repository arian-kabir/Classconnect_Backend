import { NextResponse } from 'next/server';

export async function GET() {
  const data = {
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
        ]
      }
    ]
  };
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  return NextResponse.json({ success: true });
}
