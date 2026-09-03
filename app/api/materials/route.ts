/**
 * app/api/materials/route.ts
 *
 * Course Material Provisioning Pipeline — Backend API (Module 2.3)
 *
 * ─────────────────────────────────────────────────────────────────
 * SQL SCHEMA (classconnectv2.sql — execute once on your MySQL server):
 * ─────────────────────────────────────────────────────────────────
 *
 * CREATE TABLE IF NOT EXISTS course_materials (
 *     material_id  INT AUTO_INCREMENT PRIMARY KEY,
 *     course_id    INT NOT NULL,
 *     section_id   INT NULL,           -- NULL = master file for all sections
 *     uploader_id  INT NOT NULL,       -- FK → users.user_id
 *     category_tag ENUM(
 *                    'Syllabus',
 *                    'Lecture Slides',
 *                    'Lab Manuals',
 *                    'Reference Books'
 *                  ) NOT NULL,
 *     file_name    VARCHAR(255) NOT NULL,
 *     file_url     TEXT NOT NULL,
 *     uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *     FOREIGN KEY (course_id)   REFERENCES courses(course_id)   ON DELETE CASCADE,
 *     FOREIGN KEY (section_id)  REFERENCES sections(section_id) ON DELETE CASCADE,
 *     FOREIGN KEY (uploader_id) REFERENCES users(user_id)       ON DELETE CASCADE
 * );
 *
 * ─────────────────────────────────────────────────────────────────
 * Production MySQL query (replace in-memory mock when DB is live):
 * ─────────────────────────────────────────────────────────────────
 *
 *   SELECT
 *     m.material_id AS note_id, m.category_tag, m.file_name AS title,
 *     m.file_url, m.uploaded_at AS created_at, u.full_name AS uploader_name,
 *     c.course_id, c.course_code, c.course_name,
 *     s.section_id, s.section_code, s.semester, s.year
 *   FROM course_materials m
 *   JOIN courses  c ON m.course_id   = c.course_id
 *   LEFT JOIN sections s ON m.section_id = s.section_id
 *   JOIN users    u ON m.uploader_id = u.user_id
 *   WHERE m.course_id IN (
 *     -- MICRO-COHERENCE: Only courses the authenticated user is enrolled in via Module 1
 *     SELECT DISTINCT c2.course_id
 *     FROM   routines   r
 *     JOIN   sections   s2 ON r.section_id = s2.section_id
 *     JOIN   courses    c2 ON s2.course_id  = c2.course_id
 *     WHERE  r.user_id = ?   -- bound to session.user.id — NEVER from query param
 *   )
 *   AND (? IS NULL OR m.category_tag = ?)  -- optional tag filter
 *   ORDER BY m.uploaded_at DESC;
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { db } from '@/lib/db';
import type { MaterialItem, MaterialsApiResponse, MaterialCategoryTag } from '@/types/materials';

// ---------------------------------------------------------------------------
// In-memory mock — mirrors the production SQL schema exactly.
// Replace with live db.query() calls when MySQL is wired up.
// ---------------------------------------------------------------------------

type MockMaterialItem = MaterialItem & { section_id: number };

const ALL_VALID_TAGS: ReadonlyArray<MaterialCategoryTag> = [
  'Syllabus', 'Lecture Slides', 'Lab Manuals', 'Reference Books',
];

interface MockSection {
  section_id:   number;
  section_code: string;
  semester:     string;
  year:         number;
  course_id:    number;
  course_code:  string;
  course_name:  string;
  materials:    MockMaterialItem[];
}

const mockSections: MockSection[] = [
  {
    section_id:   1,
    section_code: '1',
    course_id:    1,
    course_code:  'CSE471',
    course_name:  'System Analysis and Design',
    semester:     'Summer',
    year:         2026,
    materials: [
      {
        note_id:       1,
        title:         'CSE471 Course Syllabus Summer 2026',
        text_content:  'Official syllabus covering course objectives, grading breakdown, and weekly schedule.',
        created_at:    '2026-05-07T10:00:00Z',
        uploader_name: 'Dr. Sarah Chen',
        category_tag:  'Syllabus',
        file_url:      'https://drive.google.com/file/d/mock-syllabus-cse471',
        section_id:    1,
      },
      {
        note_id:       2,
        title:         'Lecture 1: Introduction to System Analysis',
        text_content:  'Overview of SDLC methodologies, stakeholder analysis, and feasibility study.',
        created_at:    '2026-05-14T09:30:00Z',
        uploader_name: 'Dr. Sarah Chen',
        category_tag:  'Lecture Slides',
        file_url:      'https://drive.google.com/file/d/mock-lecture1-cse471',
        section_id:    1,
      },
      {
        note_id:       3,
        title:         'Functional Requirements Lab Manual',
        text_content:  'Step-by-step guide to eliciting, documenting, and validating functional requirements.',
        created_at:    '2026-05-21T11:00:00Z',
        uploader_name: 'Faria Fairooz',
        category_tag:  'Lab Manuals',
        file_url:      'https://drive.google.com/file/d/mock-labmanual-cse471',
        section_id:    1,
      },
      {
        note_id:       4,
        title:         'Sommerville: Software Engineering (10th Ed.)',
        text_content:  'Reference textbook — chapters 4-7 are examinable for the midterm.',
        created_at:    '2026-05-07T10:05:00Z',
        uploader_name: 'Dr. Sarah Chen',
        category_tag:  'Reference Books',
        file_url:      'https://www.google.com/books/edition/Software_Engineering/mock',
        section_id:    1,
      },
    ],
  },
  {
    section_id:   3,
    section_code: '1',
    course_id:    2,
    course_code:  'CS101',
    course_name:  'Introduction to Programming',
    semester:     'Summer',
    year:         2026,
    materials: [
      {
        note_id:       5,
        title:         'CS101 Course Syllabus',
        text_content:  'Covers Python fundamentals, data structures, and algorithmic thinking.',
        created_at:    '2026-05-07T08:00:00Z',
        uploader_name: 'Grace Hopper',
        category_tag:  'Syllabus',
        file_url:      'https://drive.google.com/file/d/mock-syllabus-cs101',
        section_id:    3,
      },
      {
        note_id:       6,
        title:         'Week 1: Variables, Types & Control Flow',
        text_content:  'Slides from the first lecture covering Python syntax and control structures.',
        created_at:    '2026-05-14T08:00:00Z',
        uploader_name: 'Grace Hopper',
        category_tag:  'Lecture Slides',
        file_url:      'https://drive.google.com/file/d/mock-lecture1-cs101',
        section_id:    3,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// GET /api/materials
// Query params:
//   ?tag=Lecture+Slides   → filter by Lamia's category tag (optional)
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role   = (session.user as { role?: string }).role ?? 'student';
  const { searchParams } = new URL(req.url);
  const tagFilter = searchParams.get('tag') as MaterialCategoryTag | null;

  // Validate the tag filter value against the allowed ENUM set
  if (tagFilter !== null && !ALL_VALID_TAGS.includes(tagFilter)) {
    return NextResponse.json(
      { error: `Invalid tag. Must be one of: ${ALL_VALID_TAGS.join(', ')}` },
      { status: 400 }
    );
  }

  const sectionId = searchParams.get('sectionId');
  if (sectionId) {
    const parsedId = parseInt(sectionId, 10);
    if (!isNaN(parsedId)) {
      if (role === 'student') {
        const userId = Number((session.user as any).id);
        const [enrollmentRows] = await db.query<any[]>(
          'SELECT id FROM section_enrollments WHERE student_id = ? AND section_id = ? AND status = "active"',
          [userId, parsedId]
        );
        if (enrollmentRows.length === 0) {
          return NextResponse.json({ error: "Forbidden: You are not actively enrolled in this section." }, { status: 403 });
        }
      }
      const section = mockSections.find(s => s.section_id === parsedId);
      const visibleSections = section ? [section] : [];
      const filtered = visibleSections.map(s => ({
        ...s,
        materials: tagFilter ? s.materials.filter(m => m.category_tag === tagFilter) : s.materials,
      }));
      return NextResponse.json({
        total_sections: filtered.length,
        total_materials: filtered.reduce((acc, s) => acc + s.materials.length, 0),
        sections: filtered,
      });
    }
  }

  let visibleSections = mockSections;
  if (role === 'student') {
    const userId = Number((session.user as any).id);
    const [enrollmentRows] = await db.query<any[]>(
      'SELECT section_id FROM section_enrollments WHERE student_id = ? AND status = "active"',
      [userId]
    );
    const enrolledIds = enrollmentRows.map(r => r.section_id);
    visibleSections = mockSections.filter(s => enrolledIds.includes(s.section_id));
  }

  const filtered = visibleSections.map(section => ({
    ...section,
    materials: tagFilter
      ? section.materials.filter(m => m.category_tag === tagFilter)
      : section.materials,
  }));

  const totalMaterials = filtered.reduce((acc, s) => acc + s.materials.length, 0);

  const response: MaterialsApiResponse = {
    total_sections: filtered.length,
    total_materials: totalMaterials,
    sections: filtered,
  };

  return NextResponse.json(response);
}

// ---------------------------------------------------------------------------
// POST /api/materials
// Role guard: teacher / admin only (students cannot provision materials)
// Body: multipart/form-data with fields: section_id, title, file, category_tag
// ---------------------------------------------------------------------------

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? 'student';
  if (role !== 'teacher' && role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden: Only teachers and admins can provision course materials.' },
      { status: 403 }
    );
  }

  const formData  = await req.formData();
  const file      = formData.get('file');
  const title     = formData.get('title');
  const sectionId = parseInt(formData.get('section_id') as string, 10);
  const tagRaw    = formData.get('category_tag') as string | null;

  // ── Validation ──────────────────────────────────────────────────
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'A material title is required.' }, { status: 400 });
  }

  if (isNaN(sectionId)) {
    return NextResponse.json({ error: 'Valid section_id is required.' }, { status: 400 });
  }

  if (!tagRaw || !(ALL_VALID_TAGS as readonly string[]).includes(tagRaw)) {
    return NextResponse.json(
      { error: `category_tag must be one of: ${ALL_VALID_TAGS.join(', ')}` },
      { status: 400 }
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Allowed: PDF, DOC, DOCX, PPTX, JPEG, PNG.` },
      { status: 415 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File exceeds the 10 MB size limit.' }, { status: 413 });
  }

  // ── Find Section ────────────────────────────────────────────────
  const section = mockSections.find(s => s.section_id === sectionId);
  if (!section) {
    return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
  }

  // Teacher Content Authority (Phase 3)
  if (role === 'teacher') {
    const userId = Number((session.user as any).id);
    const [assignedSections] = await db.query<any[]>(
      'SELECT section_id FROM sections WHERE section_id = ? AND teacher_id = ?',
      [sectionId, userId]
    );
    if (assignedSections.length === 0) {
      return NextResponse.json({ error: "Forbidden: You are not officially assigned to this section by the Admin." }, { status: 403 });
    }
  }

  // ── Persist (mock) — production: INSERT INTO course_materials ... ──
  const newMaterial: MockMaterialItem = {
    note_id:       Date.now(),
    title:         title.trim(),
    text_content:  `File uploaded: ${file.name}`,
    created_at:    new Date().toISOString(),
    uploader_name: session.user?.name ?? 'Unknown Lecturer',
    category_tag:  tagRaw as MaterialCategoryTag,
    file_url:      null, // Production: store Drive/Cloudinary URL here
    section_id:    sectionId,
  };

  section.materials.push(newMaterial);

  return NextResponse.json(
    { success: true, material: newMaterial },
    { status: 201 }
  );
}
