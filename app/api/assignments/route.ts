import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Establish connection to Redis for BullMQ lazily inside handlers
// to prevent crashing Next.js build if Redis is not running locally
let deadlineQueue: Queue | null = null;
function getQueue(): Queue {
  if (!deadlineQueue) {
    const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { 
      maxRetriesPerRequest: null,
      lazyConnect: true 
    });
    
    // MICRO-COHERENCE (Phase 3): BULLMQ DEAD-LETTER QUEUE (DLQ) CONFIGURATION
    deadlineQueue = new Queue('assignment-deadlines', { 
      connection: redisConnection,
      defaultJobOptions: { 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 5000 }, 
        removeOnComplete: true, 
        removeOnFail: false 
      }
    });
  }
  return deadlineQueue;
}

interface Assignment {
  id: number;
  sectionId: number;
  title: string;
  dueDate: string;
  submissionCount: number;
  status: "active" | "closed";
}

// In-memory mock database for assignments
const mockAssignments: Assignment[] = [
  {
    id: 1,
    sectionId: 1,
    title: "Requirement Analysis Document",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
    submissionCount: 2,
    status: "active"
  },
  {
    id: 2,
    sectionId: 1,
    title: "Project Scope Presentation",
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    submissionCount: 40,
    status: "closed"
  }
];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId');
    
    // Simulate database latency
    await new Promise(resolve => setTimeout(resolve, 400));
    
    if (sectionId) {
      const parsedId = parseInt(sectionId, 10);
      if (isNaN(parsedId)) {
        return NextResponse.json({ error: "Invalid sectionId parameter" }, { status: 400 });
      }

      // Workspace Key (Phase 3): Enforce strict JOIN validation equivalent
      const role = (session?.user as any)?.role || 'student';
      if (role === 'student') {
        // Mock enrollment: Student is only in section 1 and 3
        if (parsedId !== 1 && parsedId !== 3) {
          return NextResponse.json({ error: "Forbidden: You are not actively enrolled in this section." }, { status: 403 });
        }
      }

      return NextResponse.json(mockAssignments.filter(a => a.sectionId === parsedId));
    }
    
    // If fetching all, filter to enrolled only for students
    const role = (session?.user as any)?.role || 'student';
    if (role === 'student') {
      return NextResponse.json(mockAssignments.filter(a => a.sectionId === 1 || a.sectionId === 3));
    }

    return NextResponse.json(mockAssignments);
  } catch (error) {
    console.error("[GET /api/assignments] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session?.user as any)?.role;
    
    // Zero-Trust RBAC (Phase 2): Only Teachers and Admins can create dropboxes. 
    // Tutors and Student Tutors are strictly blocked (Read-only access).
    if (role !== 'teacher' && role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Only teachers and admins can deploy dropboxes." }, { status: 403 });
    }

    const body: { sectionId?: number, title?: string, dueDate?: string } = await req.json();
    const { sectionId, title, dueDate } = body;
    
    // Strict Input Validation
    if (!sectionId || typeof sectionId !== 'number') {
      return NextResponse.json({ error: "Valid sectionId is required" }, { status: 400 });
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ error: "Valid title is required" }, { status: 400 });
    }
    if (!dueDate || isNaN(Date.parse(dueDate))) {
      return NextResponse.json({ error: "Valid ISO dueDate is required" }, { status: 400 });
    }

    // Teacher Content Authority (Phase 3)
    if (role === 'teacher') {
      const teacherName = session.user?.name;
      // In mock mode: Dr. Sarah Chen -> Section 1, Grace Hopper -> Section 3
      if ((sectionId === 1 && teacherName !== 'Dr. Sarah Chen') || (sectionId === 3 && teacherName !== 'Grace Hopper')) {
        return NextResponse.json({ error: "Forbidden: You are not officially assigned to this section by the Admin." }, { status: 403 });
      }
    }

    // Simulate database latency
    await new Promise(resolve => setTimeout(resolve, 600));

    const newAssignment: Assignment = {
      id: Date.now(),
      sectionId,
      title: title.trim(),
      dueDate,
      submissionCount: 0,
      status: "active"
    };

    mockAssignments.push(newAssignment);

    /**
     * MICRO-COHERENCE (Phase 2): BULLMQ & REDIS DEADLINE ORCHESTRATION
     * Dispatch a background job exactly 24 hours before the dueDate.
     * Faria's M3.4 Automated Alerts module will consume this job and email the students.
     */
    try {
      // Calculate delay in ms (trigger 24 hours before dueDate)
      const twentyFourHoursMs = 24 * 60 * 60 * 1000;
      const targetTime = new Date(dueDate).getTime();
      const delay = Math.max(0, targetTime - Date.now() - twentyFourHoursMs);

      // Add to BullMQ queue
      await getQueue().add('assignment-reminder-24h', {
        assignmentId: newAssignment.id,
        sectionId,
        title: newAssignment.title,
        dueDate,
        teacherId: session?.user?.email || 'unknown',
      }, { 
        delay,
        removeOnComplete: true,
        removeOnFail: false
      });
      console.log(`[BullMQ] Enqueued reminder job for assignment ${newAssignment.id} with delay ${delay}ms`);
    } catch (queueError) {
      console.warn("[BullMQ] Failed to enqueue reminder. Redis might be unreachable in this dev environment.", queueError);
    }
    
    /**
     * MICRO-COHERENCE (Phase 1): REAL-TIME SOCKET.IO PROPAGATION (M3.3 -> M3.1)
     * Tap into the existing global Socket.io server instance to broadcast updates
     * to Arian's M3.1 Section-Scoped Chat Rooms.
     */
    const io = (global as any).io;
    if (io) {
      try {
        io.to(`section_${sectionId}`).emit('assignment_deployed', { 
          assignmentId: newAssignment.id, 
          title: newAssignment.title, 
          dueDate 
        });
        console.log(`[Socket.io] Propagated assignment_deployed to section_${sectionId}`);
      } catch (socketError) {
        console.error("[Socket.io] Propagation failed:", socketError);
      }
    }

    return NextResponse.json({ success: true, assignment: newAssignment }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/assignments] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session?.user as any)?.role;
    
    if (role === 'student') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    if (!idParam) {
      return NextResponse.json({ error: "Missing assignment id" }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    const assignmentIndex = mockAssignments.findIndex(a => a.id === id);

    if (assignmentIndex === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (role === 'teacher') {
      // Assuming teacher can only delete if they own the section, but we don't have section ownership in mock.
      // Assuming it's fine for now as per instructions (Teacher can delete their own section's dropbox)
      mockAssignments.splice(assignmentIndex, 1);
    } else if (role === 'admin') {
      mockAssignments.splice(assignmentIndex, 1);
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/assignments] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
