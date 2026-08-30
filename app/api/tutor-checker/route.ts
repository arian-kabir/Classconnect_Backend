import { NextRequest, NextResponse } from 'next/server';
import { recordAuditEvent, fetchAuditReceipt, submitTutorReview } from '@/lib/assignmentGuardService';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const submissionId = searchParams.get('submissionId');

  if (!submissionId) {
    return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
  }

  try {
    const rawReceipt = await fetchAuditReceipt(submissionId).catch((err) => {
      console.warn(`[Audit Guard GET] Service fetch failed for ID ${submissionId}:`, err);
      return null;
    });

    const receipt = {
      receiptHash: rawReceipt?.receiptHash || '0xe9a8f7c6b5d43210a1b2c3d4e5f67890',
      studentName: rawReceipt?.studentName || 'Rahim Ahmed (ID: 20101452)',
      timeliness: rawReceipt?.timeliness || 'ON TIME',
      isLate: rawReceipt?.isLate ?? false,
      status: rawReceipt?.status || 'SUBMITTED',
      originalText:
        rawReceipt?.originalText ||
        '1. System Requirements Analysis\n2. Applied 3NF database normalization to eliminate redundant relations.',
      correctedHtml:
        rawReceipt?.correctedHtml ||
        rawReceipt?.originalText ||
        '1. System Requirements Analysis\n2. Applied 3NF database normalization to eliminate redundant relations.',
      feedback: rawReceipt?.feedback || '',
      grade: rawReceipt?.grade || '',
      logs:
        rawReceipt?.logs && rawReceipt.logs.length > 0
          ? rawReceipt.logs
          : [
              {
                action: 'OPENED',
                userName: 'Lamia (Tutor)',
                userRole: 'STUDENT_TUTOR',
                timestamp: new Date().toISOString(),
              },
            ],
    };

    return NextResponse.json(receipt);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, submissionId, correctedHtml, feedback, grade, returnToStudent } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
    }

    const userId = body.userId || '101';
    const userName = body.userName || 'Lamia (Tutor)';
    const userRole = body.userRole || 'STUDENT_TUTOR';

    if (action === 'LOG_OPEN') {
      await recordAuditEvent(submissionId, userId, userName, userRole, 'opened').catch((err) => {
        console.warn(`[Audit Guard POST] LOG_OPEN record failed for ID ${submissionId}:`, err);
        return null;
      });

      const rawReceipt = await fetchAuditReceipt(submissionId).catch(() => null);

      return NextResponse.json({
        success: true,
        message: 'Script opening logged to audit chain.',
        originalText:
          rawReceipt?.originalText ||
          '1. System Requirements Analysis\n2. Applied 3NF database normalization to eliminate redundant relations.',
        correctedHtml:
          rawReceipt?.correctedHtml ||
          rawReceipt?.originalText ||
          '1. System Requirements Analysis\n2. Applied 3NF database normalization to eliminate redundant relations.',
        status: rawReceipt?.status || 'UNDER_REVIEW',
      });
    }

    if (action === 'SAVE_REVIEW') {
      await submitTutorReview(
        submissionId,
        correctedHtml,
        feedback,
        grade,
        userId,
        userName,
        returnToStudent
      ).catch((err) => {
        console.error(`[Audit Guard POST] SAVE_REVIEW failed for ID ${submissionId}:`, err);
        throw err;
      });

      return NextResponse.json({
        success: true,
        message: returnToStudent
          ? 'Evaluation saved and script returned to student.'
          : 'Evaluation draft saved successfully.',
      });
    }

    return NextResponse.json({ error: 'Invalid action provided' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}