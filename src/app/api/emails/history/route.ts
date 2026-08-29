// src/app/api/emails/history/route.ts
import { NextResponse } from 'next/server';
import { getEmailHistory } from '@/lib/emailEngine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const email = searchParams.get('email') || undefined;
    const userId = userIdParam ? parseInt(userIdParam, 10) : undefined;

    const history = await getEmailHistory(userId, email);
    return NextResponse.json({ history }, { status: 200 });
  } catch (error: any) {
    console.error('[API_EMAIL_HISTORY_GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email history logs', details: error.message },
      { status: 500 }
    );
  }
}
