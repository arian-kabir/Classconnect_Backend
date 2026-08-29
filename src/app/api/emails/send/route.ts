// src/app/api/emails/send/route.ts
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/emailEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      user_id = 1,
      template_id,
      recipient_email,
      recipient_name,
      course_code,
      subject,
      body_content,
      category,
      variables,
      attachments,
    } = body;

    if (!recipient_email || !subject || !body_content) {
      return NextResponse.json(
        { error: 'Recipient email, subject, and body content are required.' },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      user_id: parseInt(user_id, 10) || 1,
      template_id: template_id ? parseInt(template_id, 10) : undefined,
      recipient_email,
      recipient_name,
      course_code,
      subject,
      body_content,
      category,
      variables,
      attachments,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API_EMAIL_SEND_POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to dispatch email', details: error.message },
      { status: 500 }
    );
  }
}
