// src/app/api/emails/drafts/route.ts
import { NextResponse } from 'next/server';
import { getEmailDrafts, saveEmailDraft, deleteEmailDraft } from '@/lib/emailEngine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam, 10) : 1;

    const drafts = await getEmailDrafts(userId);
    return NextResponse.json({ drafts }, { status: 200 });
  } catch (error: any) {
    console.error('[API_EMAIL_DRAFTS_GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email drafts', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId = 1, draft_id, template_id, recipient_email, subject, form_data, attachments } = body;

    const result = await saveEmailDraft(parseInt(userId, 10) || 1, {
      draft_id: draft_id ? parseInt(draft_id, 10) : undefined,
      template_id: template_id ? parseInt(template_id, 10) : undefined,
      recipient_email,
      subject,
      form_data: form_data || {},
      attachments: attachments || [],
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API_EMAIL_DRAFTS_POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save email draft', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const draftId = searchParams.get('draftId');
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? parseInt(userIdParam, 10) : 1;

    if (!draftId) {
      return NextResponse.json({ error: 'draftId parameter is required' }, { status: 400 });
    }

    const result = await deleteEmailDraft(parseInt(draftId, 10), userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[API_EMAIL_DRAFTS_DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete email draft', details: error.message },
      { status: 500 }
    );
  }
}
