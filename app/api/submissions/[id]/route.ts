import { NextResponse } from 'next/server';

// Directory mapping IDs to real student names and ID numbers
const studentDirectory: Record<string, { name: string; studentId: string }> = {
  '1': { name: 'John Doe', studentId: '21101234' },
  '2': { name: 'Jane Smith', studentId: '21105678' },
  '3': { name: 'Alex Johnson', studentId: '21109012' },
  '4': { name: 'Emily Davis', studentId: '21103456' },
  '5': { name: 'Michael Brown', studentId: '21107890' },
  '6': { name: 'Sarah Wilson', studentId: '21102468' },
};

const submissionsDb: Record<string, any> = {
  '1': {
    id: '1',
    studentName: 'John Doe (ID: 21101234)',
    originalText: 'Function solution() {\n  // Student submitted code/essay here\n  return true;\n}',
    correctedHtml: 'Function solution() {\n  // Student submitted code/essay here\n  return true; // Reviewed by TA\n}',
    grade: '90/100',
    feedback: 'Excellent work on logic flow!',
    status: 'reviewed',
    isLate: false,
    timeliness: 'ON TIME',
    receiptHash: '0x8f3a92b1c4e75d01a92e',
    logs: [
      {
        action: 'uploaded',
        userName: 'John Doe',
        userRole: 'Student',
        timestamp: new Date().toISOString(),
      },
    ],
  },
};

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;

  // Retrieve student details from directory or fallback cleanly
  const student = studentDirectory[id] || { 
    name: `Student ${id}`, 
    studentId: `2110${id.padStart(4, '0')}` 
  };

  const submission = submissionsDb[id] || {
    id,
    studentName: `${student.name} (ID: ${student.studentId})`,
    originalText: `Sample submission text for assignment #${id}.`,
    correctedHtml: `Sample submission text for assignment #${id}. [Reviewed]`,
    grade: '85/100',
    feedback: 'Good work overall.',
    status: 'reviewed',
    isLate: false,
    timeliness: 'ON TIME',
    receiptHash: '0x13445349',
    logs: [
      {
        action: 'uploaded',
        userName: student.name,
        userRole: 'Student',
        timestamp: new Date().toISOString(),
      },
    ],
  };

  return NextResponse.json(submission);
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const body = await request.json();

  return NextResponse.json({
    success: true,
    submission: {
      id: params.id,
      ...body,
      status: 'returned',
      logs: [
        {
          action: 'returned',
          userName: body.tutorName || 'Dr. Aris (TA)',
          userRole: 'Tutor',
          timestamp: new Date().toISOString(),
        },
      ],
    },
  });
}