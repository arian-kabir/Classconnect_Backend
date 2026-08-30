'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LecturerAssignment {
  id: number;
  initials: string;
  courseSec: string;
}

interface StudentAssignment {
  id: number;
  studentId: string;
  courseSec: string;
  seatsRemaining: number;
}

interface RoutineSlot {
  day: string;
  time: string;
  room: string;
}

export default function ClassScheduleRoutinePage() {
  const [userRole, setUserRole] = useState<'lecturer' | 'student'>('student');
  const [selectedCourse, setSelectedCourse] = useState<string>('CSE471-01');

  // Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditRoutineModal, setShowEditRoutineModal] = useState(false);

  // Form Inputs
  const [newInitials, setNewInitials] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [assignError, setAssignError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const [lecturerAssignments, setLecturerAssignments] = useState<LecturerAssignment[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([]);
  const [routineMap, setRoutineMap] = useState<Record<string, RoutineSlot[]>>({});

  const [weeklyScheduleForm, setWeeklyScheduleForm] = useState<
    Record<string, { time: string; room: string }>
  >({
    Sat: { time: '', room: '' },
    Sun: { time: '', room: '' },
    Mon: { time: '', room: '' },
    Tue: { time: '', room: '' },
    Wed: { time: '', room: '' },
    Thu: { time: '', room: '' },
    Fri: { time: '', room: '' },
  });

  const cse471 = ['CSE471-01', 'CSE471-02', 'CSE471-03', 'CSE471-04', 'CSE471-05', 'CSE471-06'];
  const cse490 = ['CSE490-01', 'CSE490-02', 'CSE490-03', 'CSE490-04'];
  const cse341 = ['CSE341-01', 'CSE341-02', 'CSE341-03', 'CSE341-04', 'CSE341-05', 'CSE341-06'];
  const cse421 = [
    'CSE421-01', 'CSE421-02', 'CSE421-03', 'CSE421-04', 'CSE421-05',
    'CSE421-06', 'CSE421-07', 'CSE421-08', 'CSE421-09', 'CSE421-10', 'CSE421-11'
  ];

  useEffect(() => {
    fetchRoutinesAndAssignments();
  }, []);

  const fetchRoutinesAndAssignments = async () => {
    try {
      const res = await fetch('/api/admin/routine');
      const result = await res.json();

      if (result.success) {
        if (result.routines) {
          const map: Record<string, RoutineSlot[]> = {};
          result.routines.forEach((row: { course_sec: string; day: string; time: string; room: string }) => {
            if (!map[row.course_sec]) map[row.course_sec] = [];
            map[row.course_sec].push({ day: row.day, time: row.time, room: row.room });
          });
          setRoutineMap(map);
        }

        if (result.lecturers) setLecturerAssignments(result.lecturers);
        if (result.students) setStudentAssignments(result.students);
      }
    } catch (err) {
      console.error('Failed to fetch data from database:', err);
    }
  };

  const handleLecturerAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInitials) return;

    const initialsUpper = newInitials.toUpperCase();

    try {
      const res = await fetch('/api/admin/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ASSIGN_LECTURER',
          initials: initialsUpper,
          course_sec: selectedCourse,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRoutinesAndAssignments();
      }
    } catch (err) {
      console.error('Failed to save lecturer assignment:', err);
    }

    setNewInitials('');
    setShowAssignModal(false);
  };

  const handleStudentAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = studentIdInput.trim();
    if (!cleanId) return;

    setAssignError('');
    const existingIndex = studentAssignments.findIndex((a) => a.courseSec === selectedCourse);
    let updatedSeats = 29;

    if (existingIndex !== -1) {
      const currentSeats = studentAssignments[existingIndex].seatsRemaining;
      if (currentSeats <= 0) {
        setAssignError('No seats available in this section!');
        return;
      }
      updatedSeats = currentSeats - 1;
    }

    try {
      const res = await fetch('/api/admin/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ASSIGN_STUDENT',
          student_id: cleanId,
          course_sec: selectedCourse,
          seats_remaining: updatedSeats,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRoutinesAndAssignments();
      }
    } catch (err) {
      console.error('Failed to save student assignment to database:', err);
    }

    setStudentIdInput('');
    setShowAssignModal(false);
  };

  const openEditRoutineModal = () => {
    const currentSlots = routineMap[selectedCourse] || [];
    const initialForm: Record<string, { time: string; room: string }> = {};

    days.forEach((day) => {
      const slot = currentSlots.find((s) => s.day === day);
      initialForm[day] = {
        time: slot ? slot.time : '',
        room: slot ? slot.room : '',
      };
    });

    setWeeklyScheduleForm(initialForm);
    setShowEditRoutineModal(true);
  };

  const handleDayInputChange = (day: string, field: 'time' | 'room', value: string) => {
    setWeeklyScheduleForm((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSaveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSlots: RoutineSlot[] = [];

    days.forEach((day) => {
      const slot = weeklyScheduleForm[day];
      if (slot && (slot.time.trim() || slot.room.trim())) {
        updatedSlots.push({ day, time: slot.time, room: slot.room });
      }
    });

    try {
      const res = await fetch('/api/admin/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_sec: selectedCourse, slots: updatedSlots }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchRoutinesAndAssignments();
      } else {
        console.error('Failed to update routine:', data.error);
      }
    } catch (err) {
      console.error('Failed to save routine to database:', err);
    }

    setShowEditRoutineModal(false);
  };

  const currentRoutine = routineMap[selectedCourse] || [];

  const filteredLecturers = lecturerAssignments.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.initials.toLowerCase().includes(query) ||
      item.courseSec.toLowerCase().includes(query)
    );
  });

  const filteredStudents = studentAssignments.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.studentId.toLowerCase().includes(query) ||
      item.courseSec.toLowerCase().includes(query)
    );
  });

  const selectedCourseSeats = studentAssignments.find((a) => a.courseSec === selectedCourse)?.seatsRemaining ?? 30;

  return (
    <div className="min-h-screen bg-[#383838] text-gray-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-[#384364] px-6 py-3 flex items-center justify-between border-b border-gray-600">
        <div className="flex items-center gap-4">
          <button className="p-1 rounded bg-[#4C5880] hover:bg-slate-600">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-xl font-bold tracking-wide text-white">Class connect</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/routine" className="px-5 py-1.5 rounded-full border border-slate-300 bg-[#596898] text-sm text-white font-semibold">
            Routine
          </Link>
          <Link href="/admin/materials" className="px-5 py-1.5 rounded-full border border-slate-400 bg-[#4C5880] text-sm text-gray-200 hover:bg-slate-600">
            Notes
          </Link>
          <button className="px-5 py-1.5 rounded-full border border-slate-400 bg-[#4C5880] text-sm text-gray-200 hover:bg-slate-600">Chat</button>
          <button className="px-5 py-1.5 rounded-full border border-slate-400 bg-[#4C5880] text-sm text-gray-200 hover:bg-slate-600">Logout</button>
        </div>
      </header>

      {/* Sub-header Banner */}
      <div className="bg-[#2D3550] px-6 py-2.5 flex items-center justify-between text-white shadow-md">
        <button className="text-xl font-bold px-2 hover:opacity-80">‹</button>
        <h1 className="text-xl font-serif text-slate-200 tracking-wide">Class Schedule</h1>

        <button
          onClick={() => {
            setUserRole(userRole === 'lecturer' ? 'student' : 'lecturer');
            setAssignError('');
          }}
          className="bg-slate-200 hover:bg-white text-slate-900 px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow"
        >
          <span>★</span>
          <span>{userRole === 'lecturer' ? 'Lecturer View' : 'Student View'}</span>
        </button>
      </div>

      {/* Main Content Layout */}
      <main className="flex-1 p-6 flex gap-6 max-w-[1400px] w-full mx-auto">
        {/* Course Section Buttons */}
        <div className="flex gap-2.5 bg-[#4A4A4A] p-3 rounded-2xl border border-gray-600 shadow-inner overflow-x-auto">
          {[
            { name: 'CSE471', list: cse471 },
            { name: 'CSE490', list: cse490 },
            { name: 'CSE341', list: cse341 },
            { name: 'CSE421', list: cse421 },
          ].map((col) => (
            <div key={col.name} className="flex flex-col gap-2 min-w-[100px]">
              {col.list.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedCourse(sec)}
                  className={`py-2 px-3 text-xs rounded border transition text-center ${
                    selectedCourse === sec
                      ? 'bg-indigo-600 text-white border-indigo-400 font-bold'
                      : 'bg-gray-200 text-gray-800 border-gray-400 hover:bg-white'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Right Cards Layout */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-[#8C8C8C] text-gray-900 rounded-3xl p-6 shadow-xl border border-gray-500 relative">
            <h2 className="text-center text-xl font-bold font-serif mb-4">
              {userRole === 'lecturer' ? 'Lecturer Map' : "Student's Schedule Map"}
            </h2>

            {/* Search Bar */}
            <div className="flex justify-end mb-4">
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder={userRole === 'lecturer' ? 'Search lecturer or course...' : 'Search Student ID...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-1.5 pl-4 pr-9 rounded-full bg-white text-xs border border-gray-400 text-gray-800 placeholder-gray-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1.5 text-xs text-gray-500">🔍</span>
              </div>
            </div>

            {/* Table */}
            <div className="bg-gray-200/90 rounded-xl overflow-hidden border border-gray-400 max-w-lg mx-auto">
              {userRole === 'lecturer' ? (
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-gray-300 border-b border-gray-400 font-bold text-gray-700">
                    <tr>
                      <th className="py-2 border-r border-gray-400">Fac Initials</th>
                      <th className="py-2 border-r border-gray-400">Courses & Sec</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {filteredLecturers.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 border-r border-gray-400 font-semibold">{row.initials}</td>
                        <td className="py-2 font-medium">{row.courseSec}</td>
                      </tr>
                    ))}
                    {filteredLecturers.length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-3 text-gray-500">
                          No lecturer assignments listed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-xs text-center border-collapse">
                  <thead className="bg-gray-300 border-b border-gray-400 font-bold text-gray-700">
                    <tr>
                      <th className="py-2 border-r border-gray-400">Student ID</th>
                      <th className="py-2 border-r border-gray-400">Seat Remaining</th>
                      <th className="py-2">Courses & Sec</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-300">
                    {filteredStudents.map((row) => (
                      <tr key={row.id}>
                        <td className="py-2 border-r border-gray-400 font-bold text-indigo-900">
                          {row.studentId}
                        </td>
                        <td className="py-2 border-r border-gray-400 font-semibold">{row.seatsRemaining}</td>
                        <td className="py-2 font-medium">{row.courseSec}</td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-3 text-gray-500">
                          No student assignments listed.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setAssignError('');
                  setShowAssignModal(true);
                }}
                className="bg-[#D9D9D9] hover:bg-white text-gray-900 border border-gray-400 px-6 py-1.5 rounded-full text-xs font-semibold shadow"
              >
                {userRole === 'lecturer' ? 'Assign Lecturer !' : 'Assign Section'}
              </button>
            </div>
          </div>

          {/* Bottom Card: Weekly Routine Grid */}
          <div className="bg-[#8C8C8C] text-gray-900 rounded-3xl p-6 shadow-xl border border-gray-500 relative flex-1">
            <h2 className="text-center text-xl font-bold font-serif mb-4">Weekly Routine ({selectedCourse})</h2>

            <div className="bg-gray-200/90 rounded-xl overflow-hidden border border-gray-400">
              <table className="w-full text-xs border-collapse">
                <tbody className="divide-y divide-gray-300">
                  {days.map((day) => {
                    const slot = currentRoutine.find((s) => s.day === day);
                    return (
                      <tr key={day} className="h-7">
                        <td className="py-1 px-4 border-r border-gray-400 font-bold text-gray-700 w-16 bg-gray-300/50">
                          {day}
                        </td>
                        <td className="py-1 px-4 border-r border-gray-300 w-28 text-gray-700 font-semibold">
                          {slot ? slot.time : ''}
                        </td>
                        <td className="py-1 px-4 text-gray-900 font-medium">
                          {slot ? `${selectedCourse} (${slot.room})` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={openEditRoutineModal}
                className="bg-[#D9D9D9] hover:bg-white text-gray-900 border border-gray-400 px-8 py-1.5 rounded-full text-xs font-serif font-bold shadow"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#D1D5DB] text-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border-2 border-indigo-500">
            {userRole === 'lecturer' ? (
              <>
                <h3 className="text-lg font-bold mb-4 text-center">Assign Lecturer to {selectedCourse}</h3>
                <form onSubmit={handleLecturerAssignSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Faculty Initials</label>
                    <input
                      type="text"
                      placeholder="e.g. MKN"
                      value={newInitials}
                      onChange={(e) => setNewInitials(e.target.value)}
                      className="w-full p-2 border border-gray-400 rounded-xl text-sm bg-white text-gray-900 uppercase"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 py-1.5 text-xs rounded-full border border-gray-400 bg-gray-300 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                    >
                      Save Assignment
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold mb-1 text-center">Assign Student Section</h3>
                <p className="text-xs text-center text-gray-600 mb-4">
                  Target: <span className="font-bold text-indigo-700">{selectedCourse}</span> ({selectedCourseSeats} seats left)
                </p>

                <form onSubmit={handleStudentAssignSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-gray-700">Student ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 21101234"
                      value={studentIdInput}
                      onChange={(e) => setStudentIdInput(e.target.value)}
                      className="w-full p-2 border border-gray-400 rounded-xl text-sm bg-white text-gray-900"
                      required
                    />
                  </div>

                  {assignError && (
                    <p className="text-xs text-red-600 font-bold text-center bg-red-100 p-1.5 rounded-lg border border-red-300">
                      {assignError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="px-4 py-1.5 text-xs rounded-full border border-gray-400 bg-gray-300 hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={selectedCourseSeats <= 0}
                      className={`px-4 py-1.5 text-xs rounded-full font-semibold text-white ${
                        selectedCourseSeats > 0
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Confirm Seat
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Edit Routine Modal */}
      {showEditRoutineModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#D1D5DB] text-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border-2 border-indigo-500 max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold mb-3 text-center">Edit Schedule for {selectedCourse}</h3>

            <form onSubmit={handleSaveRoutine} className="flex-1 overflow-y-auto pr-1 space-y-3">
              {days.map((day) => (
                <div key={day} className="bg-gray-200 p-2.5 rounded-xl border border-gray-300">
                  <p className="text-xs font-bold text-indigo-700 mb-1.5">{day} Schedule</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Time (e.g. 08:00 AM)"
                      value={weeklyScheduleForm[day]?.time || ''}
                      onChange={(e) => handleDayInputChange(day, 'time', e.target.value)}
                      className="p-2 border border-gray-400 rounded-lg text-xs bg-white text-gray-900"
                    />
                    <input
                      type="text"
                      placeholder="Room (e.g. UB201)"
                      value={weeklyScheduleForm[day]?.room || ''}
                      onChange={(e) => handleDayInputChange(day, 'room', e.target.value)}
                      className="p-2 border border-gray-400 rounded-lg text-xs bg-white text-gray-900"
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-3 sticky bottom-0 bg-[#D1D5DB] pb-1">
                <button
                  type="button"
                  onClick={() => setShowEditRoutineModal(false)}
                  className="px-4 py-1.5 text-xs rounded-full border border-gray-400 bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  Update Routine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}