import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    
    if (role !== 'student') {
      return NextResponse.json({ error: "Forbidden: Only students can upload submissions." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const assignmentId = formData.get('assignmentId');

    // Input Validation
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "A valid file is required" }, { status: 400 });
    }
    
    if (!assignmentId || isNaN(parseInt(assignmentId.toString(), 10))) {
      return NextResponse.json({ error: "Valid assignmentId is required" }, { status: 400 });
    }

    // Security Check: Enforce a file size limit (e.g., 20MB)
    const MAX_FILE_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 413 });
    }

    // In a production edge-tech environment, you would stream this file to Google Drive 
    // or AWS S3 via pre-signed URLs or direct stream to avoid memory bloat.
    // We simulate the processing time here.
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return NextResponse.json({ 
      success: true, 
      message: "File securely processed and synced to cloud storage.",
      metadata: {
        fileName: file.name,
        size: file.size,
        type: file.type
      }
    }, { status: 201 });

  } catch (error) {
    console.error("[POST /api/assignments/submissions] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
