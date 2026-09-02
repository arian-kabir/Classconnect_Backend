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

  /**
   * MICRO-COHERENCE (Phase 1): Provisioning Lockout (M1.1 Coherence)
   * Students cannot add a section to their routine if Faria's Spreadsheet Intake has not seeded 
   * the timeslots, or if a Teacher is not allocated. 
   * 
   * PRODUCTION SQL QUERY:
   * SELECT c.course_id, c.course_code, c.course_name, s.section_id, s.section_code, u.full_name AS teacher_name
   * FROM courses c
   * JOIN sections s ON c.course_id = s.course_id
   * JOIN routines r ON r.section_id = s.section_id
   * LEFT JOIN users u ON s.teacher_id = u.user_id
   * WHERE s.teacher_id IS NOT NULL 
   *   AND r.is_owner = TRUE
   *   AND (c.course_code LIKE ? OR c.course_name LIKE ?);
   */

  const courses = search
    ? ALL_COURSES.filter(c =>
        c.course_code.toLowerCase().includes(search) ||
        c.course_name.toLowerCase().includes(search)
      )
    : ALL_COURSES;

  // Enforce Provisioning Lockout: filter out sections with no teacher allocated
  const sanitizedCourses = courses.map(c => ({
    ...c,
    sections: c.sections.filter(s => s.teacher_name && s.teacher_name.trim() !== '')
  })).filter(c => c.sections.length > 0);

  return NextResponse.json(sanitizedCourses);
}
