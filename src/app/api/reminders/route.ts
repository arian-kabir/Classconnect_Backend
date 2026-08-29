// src/app/api/reminders/route.ts
import { NextResponse } from 'next/server';
import { getUpcomingDeadlineReminders, dismissReminder } from '@/lib/studySchedulerEngine';
// @ts-ignore
import db from '@/lib/db/db';

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

  const firstUser = await db.query('SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1');
  if (firstUser && firstUser.length > 0) {
    return (firstUser[0] as { user_id: number }).user_id;
  }

  return 9;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const emailParam = searchParams.get('email');
    const userId = await resolveValidUserId(userIdParam, emailParam);

    const reminders = await getUpcomingDeadlineReminders(userId);
    return NextResponse.json(reminders, { status: 200 });
  } catch (error: any) {
    console.error('[API_REMINDERS_GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deadline reminders', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId: rawUserId, email, reminderId, entity_type, entity_id, title, message, due_at, alert_offset_hours } = body;
    const userId = await resolveValidUserId(rawUserId, email);

    if (action === 'dismiss') {
      if (!reminderId) {
        return NextResponse.json({ error: 'Reminder ID is required for dismissal' }, { status: 400 });
      }
      const res = await dismissReminder(userId, reminderId);
      return NextResponse.json(res, { status: 200 });
    }

    if (!title || !due_at) {
      return NextResponse.json({ error: 'Title and due_at are required' }, { status: 400 });
    }

    const insertRes: any = await db.query(`
      INSERT INTO reminders (user_id, entity_type, entity_id, title, message, due_at, alert_offset_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      entity_type || 'custom',
      entity_id || null,
      title,
      message || null,
      due_at,
      alert_offset_hours || 24,
    ]);

    return NextResponse.json(
      { success: true, reminderId: insertRes.insertId, message: 'Reminder set successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API_REMINDERS_POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process reminder action', details: error.message },
      { status: 500 }
    );
  }
}
