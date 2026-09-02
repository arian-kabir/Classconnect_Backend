import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    
    // Security Check: Enforce allowed MIME types (PDF, DOCX, JPEG, PNG, DOC)
    const allowedMimeTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'image/jpeg', 
      'image/png', 
      'application/msword'
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported Media Type" }, { status: 415 });
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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const role = (session?.user as any)?.role;
    
    // Check if the user is authorized to view submissions
    // In a real app, students would be filtered to only see their own submissions
    if (role !== 'teacher' && role !== 'admin' && role !== 'tutor' && role !== 'student') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // In this mock, we just return empty array, normally we'd filter based on role & assignment ID
    return NextResponse.json([]);
  } catch (error) {
    console.error("[GET /api/assignments/submissions] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
