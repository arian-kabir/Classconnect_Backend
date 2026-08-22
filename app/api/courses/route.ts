import { NextResponse } from 'next/server';

export async function GET() {
  const courses = [
    {
      course_id: 1,
      course_code: "CSE471",
      course_name: "System Analysis and Design",
      sections: [
        { section_id: 1, section_code: "1", semester: "Summer", year: 2026, teacher_name: "Dr. Sarah Chen" },
        { section_id: 2, section_code: "2", semester: "Summer", year: 2026, teacher_name: "Prof. Alan Turing" }
      ]
    },
    {
      course_id: 2,
      course_code: "CS101",
      course_name: "Introduction to Programming",
      sections: [
        { section_id: 3, section_code: "1", semester: "Summer", year: 2026, teacher_name: "Grace Hopper" }
      ]
    }
  ];

  return NextResponse.json(courses);
}
