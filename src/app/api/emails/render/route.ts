// src/app/api/emails/render/route.ts
import { NextResponse } from 'next/server';
import { getTemplateById, renderTemplate } from '@/lib/emailEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { template_id, subject_template, body_template, variables = {} } = body;

    let subj = subject_template;
    let bdy = body_template;

    if (template_id) {
      const t = await getTemplateById(parseInt(template_id, 10));
      if (t) {
        if (!subj) subj = t.default_subject;
        if (!bdy) bdy = t.body_template;
      }
    }

    if (!subj || !bdy) {
      return NextResponse.json(
        { error: 'Subject and body templates or a valid template_id are required' },
        { status: 400 }
      );
    }

    const rendered = renderTemplate(subj, bdy, variables);
    return NextResponse.json({ rendered }, { status: 200 });
  } catch (error: any) {
    console.error('[API_EMAIL_RENDER_POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to render email template', details: error.message },
      { status: 500 }
    );
  }
}
