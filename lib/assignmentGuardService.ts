import { db } from '@/lib/db';
import crypto from 'crypto';

export type UserRole = 'STUDENT' | 'STUDENT_TUTOR' | 'FACULTY';
export type AuditAction = 'uploaded' | 'opened' | 'checked' | 'returned';

export interface AuditLog {
  action: AuditAction;
  user_name: string;
  user_role: UserRole;
  timestamp: Date | string;
}

export interface AuditReceipt {
  submissionId: string | number;
  studentName: string;
  submittedAt: Date | string | null;
  dueDate: Date | string | null;
  isLate: boolean;
  status: string;
  originalText?: string;
  correctedHtml?: string;
  feedback?: string;
  grade?: string;
  logs: AuditLog[];
  receiptHash: string;
}

export async function recordAuditEvent(
  submissionId: string | number,
  userId: string | number,
  userName: string,
  userRole: UserRole,
  action: AuditAction
): Promise<void> {
  await db.query(
    `INSERT INTO assignment_audit_logs (submission_id, user_id, user_name, user_role, action, timestamp) 
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [submissionId, userId, userName, userRole, action]
  );
}

export async function fetchAuditReceipt(submissionId: string | number): Promise<AuditReceipt | null> {
  const [subRows]: any = await db.query(
    `SELECT s.*, a.due_date 
     FROM assignment_submissions s 
     LEFT JOIN assignments a ON s.assignment_id = a.assignment_id 
     WHERE s.submission_id = ?`,
    [submissionId]
  );

  if (!subRows || subRows.length === 0) {
    return null;
  }

  const sub = subRows[0];
  const [logs]: any = await db.query(
    `SELECT action, user_name, user_role, timestamp 
     FROM assignment_audit_logs 
     WHERE submission_id = ? 
     ORDER BY timestamp ASC`,
    [submissionId]
  );

  const dueDate = sub.due_date ? new Date(sub.due_date) : null;
  const submittedAt = sub.submitted_at ? new Date(sub.submitted_at) : new Date();
  const isLate = dueDate ? submittedAt > dueDate : false;

  const rawHash = `${sub.submission_id}-${sub.submitted_at}-${logs.length}`;
  const receiptHash = crypto
    .createHash('sha256')
    .update(rawHash)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  return {
    submissionId: sub.submission_id,
    studentName: sub.student_name || 'Student',
    submittedAt: sub.submitted_at || null,
    dueDate: sub.due_date || null,
    isLate,
    status: sub.status || 'uploaded',
    originalText: sub.original_text || '',
    correctedHtml: sub.corrected_html || '',
    feedback: sub.feedback || '',
    grade: sub.grade || '',
    logs: logs || [],
    receiptHash,
  };
}

export async function submitTutorReview(
  submissionId: string | number,
  correctedHtml: string,
  feedback: string,
  grade: string,
  tutorId: string | number,
  tutorName: string,
  returnToStudent: boolean
): Promise<void> {
  const newStatus: AuditAction = returnToStudent ? 'returned' : 'checked';

  await db.query(
    `UPDATE assignment_submissions 
     SET corrected_html = ?, feedback = ?, grade = ?, status = ? 
     WHERE submission_id = ?`,
    [correctedHtml, feedback, grade, newStatus, submissionId]
  );

  await recordAuditEvent(
    submissionId,
    tutorId,
    tutorName,
    'STUDENT_TUTOR',
    newStatus
  );
}