import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { query } from '@/lib/db/db';
import type { MaterialsApiResponse, MaterialSection, MaterialItem } from '@/types/materials';
import type { RowDataPacket } from 'mysql2/promise';

interface SectionRow extends RowDataPacket {
  section_id: number;
  section_code: string;
  semester: string;
  year: number;
  course_id: number;
  course_code: string;
  course_name: string;
}

interface NoteRow extends RowDataPacket {
  note_id: number;
  title: string;
  text_content: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  uploader_id: number;
  uploader_name: string;
  section_id: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/materials
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.db_user_id) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  const userId = session.user.db_user_id;
  const role   = session.user.role; 

  try {
    let sectionRows: SectionRow[];

    // 1. Fetch distinct sections and courses
    if (role === 'student') {
      sectionRows = await query<SectionRow>(
        `SELECT DISTINCT
           s.section_id, s.section_code, s.semester, s.year,
           c.course_id, c.course_code, c.course_name
         FROM (
           SELECT section_id FROM section_enrollments WHERE student_id = ? AND status = 'active'
           UNION
           SELECT section_id FROM routines WHERE user_id = ?
         ) as my_sections
         INNER JOIN sections s ON my_sections.section_id = s.section_id
         INNER JOIN courses c ON s.course_id = c.course_id
         ORDER BY c.course_code ASC, s.section_id ASC`,
        [userId, userId]
      );
    } else {
      const teacherFilter = role === 'admin' ? '' : 'WHERE s.teacher_id = ?';
      const params        = role === 'admin' ? [] : [userId];
      sectionRows = await query<SectionRow>(
        `SELECT
           s.section_id, s.section_code, s.semester, s.year,
           c.course_id, c.course_code, c.course_name
         FROM sections s
         INNER JOIN courses c ON s.course_id = c.course_id
         ${teacherFilter}
         ORDER BY c.course_code ASC, s.section_id ASC`,
        params
      );
    }

    if (sectionRows.length === 0) {
      return NextResponse.json(
        { role, total_sections: 0, total_materials: 0, sections: [] },
        { status: 200 }
      );
    }

    // 2. Extract section IDs to batch fetch notes
    const sectionIds = sectionRows.map(r => r.section_id);
    const placeholders = sectionIds.map(() => '?').join(',');

    // 3. Fetch notes only for those sections in one optimized query
    const noteRows = await query<NoteRow>(
      `SELECT
         n.id AS note_id, n.title, n.text_content, n.created_at, n.updated_at,
         n.user_id AS uploader_id, u.full_name AS uploader_name,
         n.section_id
       FROM notes n
       LEFT JOIN users u ON n.user_id = u.user_id
       WHERE n.section_id IN (${placeholders}) AND n.is_archived = 0
       ORDER BY n.created_at DESC`,
      sectionIds
    );

    // 4. Hydrate in memory O(N)
    const sectionMap = new Map<number, MaterialSection>();
    for (const s of sectionRows) {
      sectionMap.set(s.section_id, {
        section_id: s.section_id,
        section_code: s.section_code,
        semester: s.semester,
        year: s.year,
        course_id: s.course_id,
        course_code: s.course_code,
        course_name: s.course_name,
        materials: []
      });
    }

    let totalMaterials = 0;
    for (const n of noteRows) {
      const sec = sectionMap.get(n.section_id);
      if (sec) {
        sec.materials.push({
          note_id: n.note_id,
          title: n.title,
          text_content: n.text_content ?? '',
          created_at: n.created_at instanceof Date ? n.created_at.toISOString() : String(n.created_at),
          updated_at: n.updated_at instanceof Date ? n.updated_at.toISOString() : String(n.updated_at),
          uploader_id: n.uploader_id,
          uploader_name: n.uploader_name
        });
        totalMaterials++;
      }
    }

    const sections = Array.from(sectionMap.values());

    const response: MaterialsApiResponse = {
      role,
      total_sections: sections.length,
      total_materials: totalMaterials,
      sections,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=0, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[API_MATERIALS_GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/materials
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.db_user_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only teachers and admins can upload materials
  if (session.user.role !== 'teacher' && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { section_id, title, text_content } = body;

    if (!section_id || !title) {
      return NextResponse.json({ error: 'Missing section_id or title' }, { status: 400 });
    }

    // Security Check: Ensure the teacher actually teaches this section (admins bypass this)
    if (session.user.role === 'teacher') {
      const authCheck = await query<RowDataPacket>(
        `SELECT 1 FROM sections WHERE section_id = ? AND teacher_id = ? LIMIT 1`,
        [section_id, session.user.db_user_id]
      );
      if (authCheck.length === 0) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have authorization to upload materials to this section.' },
          { status: 403 }
        );
      }
    }

    await query(
      `INSERT INTO notes (section_id, user_id, title, text_content, created_at, updated_at, is_archived) 
       VALUES (?, ?, ?, ?, NOW(), NOW(), 0)`,
      [section_id, session.user.db_user_id, title, text_content || '']
    );

    return NextResponse.json({ success: true, message: 'Material added successfully' }, { status: 201 });
  } catch (error) {
    console.error('[API_MATERIALS_POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to append material', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
