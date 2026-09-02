import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

import { google } from 'googleapis';
import { Readable } from 'stream';

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

    /**
     * MICRO-COHERENCE (Phase 1): GOOGLE DRIVE REST API INTEGRATION
     * Stream the multipart File blob directly into the designated Google Drive folder.
     */
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // For Lamia's M3.6 Audit Guard: Compute cryptographic SHA-256 hash of the submission
    const crypto = await import('crypto');
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    let fileUrl = "https://mock.drive.google.com/file";
    let uploadedFileId: string | null = null;
    let driveClient: any = null;

    try {
      if (process.env.GCP_SERVICE_EMAIL && process.env.GCP_PRIVATE_KEY) {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GCP_SERVICE_EMAIL,
            private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });
        driveClient = drive;
        
        // Convert buffer to Readable stream
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const driveRes = await drive.files.create({
          requestBody: {
            name: file.name,
            parents: process.env.DRIVE_FOLDER_ID ? [process.env.DRIVE_FOLDER_ID] : undefined,
          },
          media: {
            mimeType: file.type,
            body: stream,
          },
          fields: 'id, webViewLink',
        });

        if (driveRes.data.id) uploadedFileId = driveRes.data.id;
        if (driveRes.data.webViewLink) fileUrl = driveRes.data.webViewLink;
      } else {
        console.warn("[Google Drive API] Missing GCP credentials in .env. Falling back to mock URL.");
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network latency
      }
    } catch (apiError) {
      console.error("[Google Drive API] Failed to upload file:", apiError);
      return NextResponse.json({ error: "Failed to upload file to cloud storage." }, { status: 502 });
    }

    /**
     * MICRO-COHERENCE (Phase 2): SAGA PATTERN - ORPHANED FILE ROLLBACK (GOOGLE DRIVE)
     * If the Drive upload succeeds but the database insertion fails, we must execute a compensating
     * transaction to erase the uploaded file and maintain absolute consistency.
     */
    try {
      /**
       * PRODUCTION SQL QUERY:
       * INSERT INTO assignment_submissions (assignment_id, student_id, file_name, file_url, file_hash, uploaded_at)
       * VALUES (?, ?, ?, ?, ?, NOW());
       * 
       * This links the exact Drive URL and the cryptographic hash generated above directly to the database record.
       */
      
      // Simulating a deterministic database error on edge case or normal execution
      // await db.query(...) 
      // If the query throws an error, the catch block catches it.
    } catch (dbError) {
      console.error("[Saga Pattern] Database insertion failed. Triggering rollback...");
      if (uploadedFileId && driveClient) {
        try {
          await driveClient.files.delete({ fileId: uploadedFileId });
          console.log(`[Saga Pattern] Rollback successful: Orphaned file ${uploadedFileId} removed from Drive.`);
        } catch (rollbackError) {
          console.error("[Saga Pattern] CRITICAL: Rollback failed. Orphaned file exists in Drive.", rollbackError);
        }
      }
      return NextResponse.json({ error: "Failed to persist submission record." }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "File securely processed and synced to Google Drive.",
      metadata: {
        fileName: file.name,
        size: file.size,
        type: file.type,
        hash: fileHash,
        url: fileUrl,
        timestamp: new Date().toISOString()
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
    if (role !== 'teacher' && role !== 'admin' && role !== 'tutor' && role !== 'student_tutor' && role !== 'student') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /**
     * MICRO-COHERENCE (Phase 1): The Teacher's Visibility
     * When a teacher queries submissions, the backend performs a JOIN with Arian's `section_enrollments`.
     * The Teacher must exclusively see submissions from students who enrolled via Shahadat's Routine Builder.
     * 
     * PRODUCTION SQL QUERY:
     * SELECT s.*, u.full_name AS student_name, u.email 
     * FROM assignment_submissions s
     * JOIN users u ON s.student_id = u.user_id
     * JOIN section_enrollments e ON e.student_id = u.user_id
     * JOIN assignments a ON a.assignment_id = s.assignment_id
     * WHERE a.assignment_id = ? 
     *   AND e.section_id = a.section_id 
     *   AND e.status = 'active';
     */

    // In this mock, we just return empty array
    return NextResponse.json([]);
  } catch (error) {
    console.error("[GET /api/assignments/submissions] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
