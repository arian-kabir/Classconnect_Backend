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
  // Parse the multipart form data sent by the frontend
  const formData = await req.formData();
  const file = formData.get('file');
  const title = formData.get('title');
  const sectionId = formData.get('section_id');

  console.log(`Mocking upload for file: ${file ? (file as File).name : 'none'} to section ${sectionId}`);

  return NextResponse.json({ success: true, uploaded_title: title });
}
