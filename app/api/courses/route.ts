import { NextResponse }     from 'next/server';
import { getServerSession }  from 'next-auth';
import { authOptions }       from '../auth/[...nextauth]/route';

const ALL_COURSES = [
  {
    course_id:   1,
    course_code: 'CSE471',
    course_name: 'System Analysis and Design',
    sections: [
      { section_id: 1, section_code: '1', semester: 'Summer', year: 2026, teacher_name: 'Dr. Sarah Chen' },
      { section_id: 2, section_code: '2', semester: 'Summer', year: 2026, teacher_name: 'Prof. Alan Turing' },
    ],
  },
  {
    course_id:   2,
    course_code: 'CS101',
    course_name: 'Introduction to Programming',
    sections: [
      { section_id: 3, section_code: '1', semester: 'Summer', year: 2026, teacher_name: 'Grace Hopper' },
    ],
  },
  {
    course_id:   3,
    course_code: 'MAT202',
    course_name: 'Discrete Mathematics',
    sections: [
      { section_id: 4, section_code: '1', semester: 'Summer', year: 2026, teacher_name: 'Dr. Ada Lovelace' },
    ],
  },
];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.toLowerCase().trim() ?? '';

  const courses = search
    ? ALL_COURSES.filter(c =>
        c.course_code.toLowerCase().includes(search) ||
        c.course_name.toLowerCase().includes(search)
      )
    : ALL_COURSES;

  return NextResponse.json(courses);
}
