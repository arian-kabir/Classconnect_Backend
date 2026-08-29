// src/app/api/emails/templates/route.ts
import { NextResponse } from 'next/server';
import { getEmailTemplates, getTemplateById } from '@/lib/emailEngine';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const templateIdParam = searchParams.get('templateId');

    if (templateIdParam) {
      const template = await getTemplateById(parseInt(templateIdParam, 10));
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ template }, { status: 200 });
    }

    const templates = await getEmailTemplates(category);
    return NextResponse.json({ templates }, { status: 200 });
  } catch (error: any) {
    console.error('[API_EMAIL_TEMPLATES_GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email templates', details: error.message },
      { status: 500 }
    );
  }
}
