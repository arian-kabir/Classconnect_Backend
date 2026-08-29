// src/app/api/emails/recipients/route.ts
import { NextResponse } from 'next/server';
import { getInstructorRecipients } from '@/lib/emailEngine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam, 10) : 1;

    const recipients = await getInstructorRecipients(userId);
    return NextResponse.json({ recipients }, { status: 200 });
  } catch (error: any) {
    console.error('[API_EMAIL_RECIPIENTS_GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch instructor recipients', details: error.message },
      { status: 500 }
    );
  }
}
