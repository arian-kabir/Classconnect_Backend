import { NextResponse } from 'next/server';
import type { RoutineEntry } from '@/types/index';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

// In-memory database for local testing
let mockRoutines: RoutineEntry[] = [
  {
    routine_id: 1,
    day_of_week: "Monday",
    start_time: "08:00:00",
    end_time: "09:20:00",
    room_number: "UB2101",
    course_code: "CSE471",
    course_name: "System Analysis and Design",
    section_code: "1",
    section_id: 1,
    teacher_name: "Dr. Sarah Chen",
    is_owner: true // True because Sarah Chen is the teacher who created it
  } as RoutineEntry
];

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role || 'student';
  
  if (role === 'student') {
    // Students only see their own enrolled classes (is_owner: false)
    return NextResponse.json(mockRoutines.filter(r => !r.is_owner));
  }
  
  // Teachers and Admins can see the global master timetable
  return NextResponse.json(mockRoutines.filter(r => r.is_owner));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role || 'student';
  const userName = session?.user?.name || 'Current User';
  const body = await req.json();

  if (role === 'student') {
    // Audit check 1: Student duplicate enrollment
    const alreadyEnrolled = mockRoutines.some(r => r.section_id === parseInt(body.section_id) && !r.is_owner);
    if (alreadyEnrolled) {
      return NextResponse.json({ error: "You are already enrolled in this section." }, { status: 409 });
    }

    // Student logic: Find the master routine scheduled by the teacher
    const masterRoutine = mockRoutines.find(r => r.section_id === parseInt(body.section_id) && r.is_owner);
    if (!masterRoutine) {
      return NextResponse.json({ error: "No teacher has scheduled this section yet." }, { status: 400 });
    }
    
    // Auto-fetch and clone the slot for the student
    const studentRoutine = {
      ...masterRoutine,
      routine_id: Date.now(), // Unique ID for student's enrollment record
      is_owner: false, // Students don't own the class block
      teacher_name: masterRoutine.teacher_name
    } as unknown as RoutineEntry;
    
    mockRoutines.push(studentRoutine);
    return NextResponse.json({ success: true, routine: studentRoutine });
  }

  // Audit check 2: Teacher time conflict
  const hasConflict = mockRoutines.some(r => 
    r.is_owner && 
    r.day_of_week === body.day_of_week && 
    ((body.start_time >= r.start_time && body.start_time < r.end_time) || 
     (body.end_time > r.start_time && body.end_time <= r.end_time))
  );

  if (hasConflict) {
    const conflictSlot = mockRoutines.find(r => r.day_of_week === body.day_of_week)!;
    return NextResponse.json({ 
      error: "Time conflict detected", 
      conflict: {
        course_code: conflictSlot.course_code,
        section_id: conflictSlot.section_id,
        day_of_week: conflictSlot.day_of_week,
        start_time: conflictSlot.start_time,
        end_time: conflictSlot.end_time
      } 
    }, { status: 409 });
  }

  // Teacher / Admin logic: Schedule the new class slot
  const newRoutine = {
    routine_id: Date.now(),
    day_of_week: body.day_of_week,
    start_time: body.start_time,
    end_time: body.end_time,
    room_number: body.room_number,
    course_code: "NEW", 
    course_name: "Newly Added Course", 
    section_code: "1", 
    section_id: parseInt(body.section_id),
    teacher_name: userName,
    is_owner: true // Teachers own the slots they create
  } as unknown as RoutineEntry;

  mockRoutines.push(newRoutine);
  return NextResponse.json({ success: true, routine: newRoutine });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role || 'student';
  const userName = session?.user?.name || 'Current User';

  const { searchParams } = new URL(req.url);
  const routineIdStr = searchParams.get('routine_id');
  
  if (routineIdStr) {
    const routineId = parseInt(routineIdStr);
    const routineToDelete = mockRoutines.find(r => r.routine_id === routineId);
    
    if (routineToDelete) {
      // 1. Admins have absolute privileges
      // 2. Teachers can only delete their OWN routines
      // 3. Students can only drop their own enrollment (where is_owner is false)
      const isAdmin = role === 'admin';
      const isTeacherOwner = role === 'teacher' && routineToDelete.teacher_name === userName;
      const isStudentDropping = role === 'student' && !routineToDelete.is_owner;
      
      if (isAdmin || isTeacherOwner || isStudentDropping) {
        mockRoutines = mockRoutines.filter(r => r.routine_id !== routineId);
      } else {
        return NextResponse.json({ error: "Unauthorized to modify this routine." }, { status: 403 });
      }
    }
  }
  return NextResponse.json({ success: true });
}
