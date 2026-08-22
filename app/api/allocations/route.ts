import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ledger: [
      {
        sectionId: 1,
        courseId: 1,
        courseCode: 'CSE471',
        courseName: 'System Analysis and Design',
        credits: 3.0,
        departmentName: 'Computer Science',
        sectionCode: '1',
        semester: 'Summer',
        year: 2026,
        sectionType: 'LECTURE',
        maxStudents: 35,
        enrolledCount: 30,
        primaryInstructor: {
          userId: 1,
          fullName: 'Dr. Sarah Chen',
          email: 'sarah.chen@bracu.ac.bd',
          role: 'teacher',
          staffRoleType: 'primary_instructor',
          initials: 'SC'
        },
        supportStaff: [],
        schedules: [
          { dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:20', roomNumber: 'UB2101' }
        ],
        status: 'synced',
        lastSyncedAt: new Date().toISOString()
      },
      {
        sectionId: 2,
        courseId: 2,
        courseCode: 'CS101',
        courseName: 'Introduction to Programming',
        credits: 3.0,
        departmentName: 'Computer Science',
        sectionCode: '1',
        semester: 'Summer',
        year: 2026,
        sectionType: 'LAB',
        maxStudents: 40,
        enrolledCount: 40,
        primaryInstructor: null,
        supportStaff: [],
        schedules: [],
        status: 'unassigned'
      }
    ]
  });
}
