// src/app/api/study-scheduler/route.ts
import { NextResponse } from 'next/server';
// @ts-ignore
import db from '@/lib/db/db';
import {
  getUnifiedTimetable,
  createStudySession,
  updateStudySession,
  deleteStudySession,
} from '@/lib/studySchedulerEngine';

/** Helper to ensure userId is valid against the database */
async function resolveValidUserId(inputUserId?: any, email?: string | null): Promise<number> {
  if (email) {
    const userByEmail = await db.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    if (userByEmail && userByEmail.length > 0) {
      return (userByEmail[0] as { user_id: number }).user_id;
    }
  }

  const numericId = parseInt(String(inputUserId), 10);
  if (!isNaN(numericId) && numericId > 0) {
    const userRows = await db.query('SELECT user_id FROM users WHERE user_id = ? LIMIT 1', [numericId]);
    if (userRows && userRows.length > 0) {
      return numericId;
    }
  }

  // Fallback to first available active user in database
  const firstUser = await db.query('SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1');
  if (firstUser && firstUser.length > 0) {
    return (firstUser[0] as { user_id: number }).user_id;
  }

  return 9; // Faria default
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const emailParam = searchParams.get('email');
    const userId = await resolveValidUserId(userIdParam, emailParam);

    const data = await getUnifiedTimetable(userId);
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error('[API_STUDY_SCHEDULER_GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contextual study schedule', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userId: rawUserId,
      email,
      course_id,
      title,
      description,
      day_of_week,
      start_time,
      end_time,
      priority,
      color_tag,
      allow_conflict,
    } = body;

    const userId = await resolveValidUserId(rawUserId, email);

    if (!title || !day_of_week || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Title, day of the week, start time, and end time are required.' },
        { status: 400 }
      );
    }

    const result = await createStudySession(userId, {
      course_id: course_id ? parseInt(course_id, 10) : null,
      title,
      description,
      day_of_week,
      start_time,
      end_time,
      priority,
      color_tag,
      allow_conflict,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 409 }); // 409 Conflict
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('[API_STUDY_SCHEDULER_POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create study session', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId: rawUserId, email, sessionId, ...updateData } = body;
    const userId = await resolveValidUserId(rawUserId, email);

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const result = await updateStudySession(userId, sessionId, updateData);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API_STUDY_SCHEDULER_PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update study session', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const emailParam = searchParams.get('email');
    const sessionIdParam = searchParams.get('sessionId');

    const userId = await resolveValidUserId(userIdParam, emailParam);
    const sessionId = sessionIdParam ? parseInt(sessionIdParam, 10) : null;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const result = await deleteStudySession(userId, sessionId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API_STUDY_SCHEDULER_DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete study session', details: error.message },
      { status: 500 }
    );
  }
}
