/**
 * src/types/materials.ts
 *
 * Types for the Course Material Provisioning Pipeline (Module 2).
 *
 * category_tag ENUM values MUST match the SQL definition in classconnectv2.sql:
 *   ENUM('Syllabus', 'Lecture Slides', 'Lab Manuals', 'Reference Books')
 *
 * INTEGRATION HOOK — Lamia's M1.2 (Course Material Category Classifier):
 * The `category_tag` field is the direct binding point for Lamia's structural
 * metadata system. Every MaterialItem carries a tag so the pipeline filter UI
 * can sort assets into the correct classifier category.
 */

/** Exactly matches ENUM('Syllabus', 'Lecture Slides', 'Lab Manuals', 'Reference Books') */
export type MaterialCategoryTag =
  | 'Syllabus'
  | 'Lecture Slides'
  | 'Lab Manuals'
  | 'Reference Books';

export const ALL_CATEGORY_TAGS: ReadonlyArray<MaterialCategoryTag> = [
  'Syllabus',
  'Lecture Slides',
  'Lab Manuals',
  'Reference Books',
];

export interface MaterialItem {
  note_id: number;
  title: string;
  text_content: string;
  created_at: string;
  uploader_name: string | null;
  /**
   * Lamia's M1.2 structural metadata tag.
   * Null for legacy/untagged materials uploaded before the classifier was deployed.
   */
  category_tag: MaterialCategoryTag | null;
  /**
   * Direct download / preview URL (Google Drive, Cloudinary, or local path).
   * Null if the material is text-only.
   */
  file_url: string | null;
}

export interface MaterialSection {
  section_id: number;
  section_code: string;
  semester: string;
  year: number;
  course_id: number;
  course_code: string;
  course_name: string;
  materials: MaterialItem[];
}

export interface MaterialsApiResponse {
  total_sections: number;
  total_materials: number;
  sections: MaterialSection[];
}
