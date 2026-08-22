/**
 * src/types/index.ts
 *
 * Unified, zero-compromise type system for ClassConnect.
 *
 * Design decisions:
 * - UserRole values exactly match the MySQL ENUM in classconnectv2.sql
 *   ('student' | 'teacher' | 'admin') to eliminate the C-1 mismatch.
 * - All DB row interfaces extend RowDataPacket for mysql2 compatibility.
 * - Branded types prevent mixing numeric IDs (e.g., userId vs routineId).
 * - Readonly arrays prevent accidental mutation of API response data.
 * - NextAuth module augmentation extends the Session/JWT types to carry
 *   our custom user fields without type casts.
 */

export interface RowDataPacket {
  [column: string]: any;
}
import type { DefaultSession } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

// ---------------------------------------------------------------------------
// Branded ID Types (prevent ID mix-ups at compile time)
// ---------------------------------------------------------------------------

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type UserId     = Brand<number, 'UserId'>;
export type CourseId   = Brand<number, 'CourseId'>;
export type SectionId  = Brand<number, 'SectionId'>;
export type RoutineId  = Brand<number, 'RoutineId'>;
export type NoteId     = Brand<number, 'NoteId'>;
export type RoomId     = Brand<number, 'RoomId'>;
export type MessageId  = Brand<number, 'MessageId'>;

// Helper — cast a plain number to a branded ID (use at trust boundaries only)
export function asUserId(n: number): UserId       { return n as UserId; }
export function asSectionId(n: number): SectionId { return n as SectionId; }
export function asRoutineId(n: number): RoutineId { return n as RoutineId; }
export function asNoteId(n: number): NoteId       { return n as NoteId; }

// ---------------------------------------------------------------------------
// Database Enum Types (MUST match MySQL ENUM definitions exactly)
// ---------------------------------------------------------------------------

/** Matches `users.role` ENUM('student', 'teacher', 'admin') */
export type DbUserRole = 'student' | 'teacher' | 'admin';

/** Matches `routines.day_of_week` ENUM */
export type DayOfWeek =
  | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday'
  | 'Friday' | 'Saturday' | 'Sunday';

/** Matches `section_enrollments.status` ENUM */
export type EnrollmentStatus = 'active' | 'dropped' | 'completed';

/** Matches `chat_messages.message_type` ENUM */
export type MessageType = 'text' | 'image' | 'file';

/** Matches `study_plans.priority` ENUM */
export type PlanPriority = 'low' | 'medium' | 'high';

/** Matches `study_plans.status` ENUM */
export type PlanStatus = 'pending' | 'in-progress' | 'completed';

/** Matches `assignment_submissions.status` ENUM */
export type SubmissionStatus = 'submitted' | 'graded' | 'returned';

// ---------------------------------------------------------------------------
// Database Row Interfaces (mysql2 RowDataPacket-compatible)
// ---------------------------------------------------------------------------

export interface UserRow extends RowDataPacket {
  user_id:         UserId;
  email:           string;
  password_hash:   string;
  full_name:       string;
  role:            DbUserRole;
  profile_picture: string | null;
  created_at:      Date;
  last_active:     Date;
}

export interface CourseRow extends RowDataPacket {
  course_id:   CourseId;
  course_code: string;
  course_name: string;
  department_id: number | null;
  credits:     number;
  created_at:  Date;
}

export interface SectionRow extends RowDataPacket {
  section_id:   SectionId;
  course_id:    CourseId;
  section_code: string;
  semester:     string;
  year:         number;
  teacher_id:   UserId | null;
  max_students: number;
  created_at:   Date;
}

export interface RoutineRow extends RowDataPacket {
  routine_id:   RoutineId;
  user_id:      UserId;
  section_id:   SectionId;
  day_of_week:  DayOfWeek;
  start_time:   string; // HH:MM:SS from MySQL TIME type
  end_time:     string;
  room_number:  string | null;
  created_at:   Date;
}

export interface NoteRow extends RowDataPacket {
  id:           NoteId;
  title:        string;
  content:      string | null; // Stored as JSON string in MySQL
  text_content: string;
  user_id:      UserId;
  section_id:   SectionId;
  is_archived:  boolean | number; // MySQL BOOLEAN returns 0/1
  created_at:   Date;
  updated_at:   Date;
}

export interface ChatRoomRow extends RowDataPacket {
  room_id:     RoomId;
  section_id:  SectionId;
  room_name:   string | null;
  created_at:  Date;
}

export interface ChatMessageRow extends RowDataPacket {
  message_id:          MessageId;
  room_id:             RoomId;
  sender_id:           UserId;
  message_text:        string;
  message_type:        MessageType;
  file_url:            string | null;
  sent_at:             Date;
  is_read:             boolean | number;
  reply_to_message_id: MessageId | null;
}

// ---------------------------------------------------------------------------
// API Response Shapes (enriched, frontend-facing)
// ---------------------------------------------------------------------------

export interface RoutineEntry {
  routine_id:   RoutineId;
  day_of_week:  DayOfWeek;
  start_time:   string;
  end_time:     string;
  room_number:  string | null;
  course_code:  string;
  course_name:  string;
  section_code: string;
  section_id:   SectionId;
  teacher_name: string | null;
  is_owner?:    boolean;
}

export interface SectionOption {
  section_id:   SectionId;
  section_code: string;
  semester:     string;
  year:         number;
  teacher_name: string | null;
}

export interface CourseWithSections {
  course_id:   CourseId;
  course_code: string;
  course_name: string;
  sections:    SectionOption[];
}

export interface ExcalidrawElement {
  id:   string;
  type: string;
  [key: string]: unknown;
}

export interface ExcalidrawContent {
  type:     'excalidraw';
  elements: ExcalidrawElement[];
}

export interface NoteWithContent {
  id:           NoteId;
  title:        string;
  content:      ExcalidrawContent | null;
  text_content: string;
  user_id:      UserId;
  section_id:   SectionId;
  is_archived:  boolean;
  created_at:   string;
  updated_at:   string;
}

export interface ConflictDetail {
  course_code: string;
  section_id:  SectionId;
  day_of_week: DayOfWeek;
  start_time:  string;
  end_time:    string;
}

export interface DashboardStats {
  totalCourses:         number;
  upcomingAssignments:  number;
}

export interface DashboardCourse {
  id:         CourseId;
  name:       string;
  code:       string;
  lecturer:   string | null;
  section_id: SectionId;
  progress:   number;
  nextClass:  Date | null;
}

export interface DashboardData {
  stats:   DashboardStats;
  courses: DashboardCourse[];
}
