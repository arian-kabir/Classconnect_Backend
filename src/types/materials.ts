/**
 * src/types/materials.ts
 *
 * Types for the Course Material Provisioning Pipeline.
 */

export interface MaterialItem {
  note_id: number;
  title: string;
  text_content: string;
  created_at: string;
  updated_at: string;
  uploader_id: number;
  uploader_name: string | null;
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
  role: 'student' | 'teacher' | 'admin';
  total_sections: number;
  total_materials: number;
  sections: MaterialSection[];
}
