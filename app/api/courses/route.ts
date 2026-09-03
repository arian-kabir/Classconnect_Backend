import { NextResponse }     from 'next/server';
import { getServerSession }  from 'next-auth';
import { authOptions }       from '../auth/[...nextauth]/route';
import { db }                from '@/lib/db';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.toLowerCase().trim() ?? '';

  try {
    const likeSearch = search ? `%${search}%` : '%';
    
    // Fetch courses and their sections from the real database seeded by Faria's module
    const [rows] = await db.query<any[]>(`
      SELECT 
        c.course_id, c.course_code, c.course_name, 
        s.section_id, s.section_code, s.semester, s.year, 
        u.full_name AS teacher_name
      FROM courses c
      JOIN sections s ON c.course_id = s.course_id
      LEFT JOIN users u ON s.teacher_id = u.user_id
      WHERE (c.course_code LIKE ? OR c.course_name LIKE ?)
    `, [likeSearch, likeSearch]);

    // Group sections by course to match the CourseWithSections[] contract
    const coursesMap = new Map<number, any>();

    for (const row of rows) {
      if (!coursesMap.has(row.course_id)) {
        coursesMap.set(row.course_id, {
          course_id: row.course_id,
          course_code: row.course_code,
          course_name: row.course_name,
          sections: [],
        });
      }
      
      const course = coursesMap.get(row.course_id);
      course.sections.push({
        section_id: row.section_id,
        section_code: row.section_code,
        semester: row.semester || 'Summer',
        year: row.year || 2026,
        teacher_name: row.teacher_name,
      });
    }

    const coursesArray = Array.from(coursesMap.values());

    // Enforce Provisioning Lockout: filter out sections with no teacher allocated
    // (This mimics the frontend requirement where sections without teachers are not selectable)
    const sanitizedCourses = coursesArray.map(c => ({
      ...c,
      sections: c.sections.filter((s: any) => s.teacher_name && s.teacher_name.trim() !== '')
    })).filter(c => c.sections.length > 0);

    return NextResponse.json(sanitizedCourses);
  } catch (error: any) {
    console.error('Courses DB Error:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}
