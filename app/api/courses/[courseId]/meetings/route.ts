import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  // Await params per Next.js 16 (App Router) spec
  const { courseId } = await params;

  // Mock endpoint to prevent next.config.mjs from proxying to 3001 and throwing ECONNREFUSED
  // Return an empty array or mock data for the CrossFacultyCoordination component
  return NextResponse.json([
    {
      id: 1,
      title: "Midterm Question Moderation",
      proposedBy: "Dr. Sarah Chen",
      status: "voting",
      options: [
        { time: "Mon, 10:00 AM", votes: 2 },
        { time: "Tue, 02:00 PM", votes: 5 }
      ]
    }
  ]);
}
