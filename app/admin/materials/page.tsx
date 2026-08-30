'use client';

import { useState, useEffect, useRef } from 'react';

// --- Interfaces ---
interface Material {
  material_id: number;
  title: string;
  category_name: string;
  file_size_bytes?: number;
  created_at: string;
  file_url: string;
}

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
}

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

const CATEGORIES = [
  { id: 1, name: 'Syllabus', color: 'bg-blue-500' },
  { id: 2, name: 'Lecture Slides', color: 'bg-yellow-400' },
  { id: 3, name: 'Lab Manuals', color: 'bg-red-500' },
  { id: 4, name: 'Reference Book', color: 'bg-emerald-500' },
];

export default function ClassConnectUnifiedPortal() {
  // Main Tab State
  const [activeTab, setActiveTab] = useState<'routine' | 'notes' | 'checker' | 'audit'>('notes');

  // ==========================================
  // 1. NOTES & MATERIALS STATE & HANDLERS
  // ==========================================
  const [materials, setMaterials] = useState<Material[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showOpenLibraryModal, setShowOpenLibraryModal] = useState(false);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');
  const [title, setTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(2);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<OpenLibraryBook[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/admin/materials');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMaterials(data.data);
      }
    } catch (err) {
      console.error('Fetch materials error:', err);
    }
  };

  const getBrowserViewableUrl = (url: string) => {
    if (!url) return '#';
    const lower = url.toLowerCase();
    if (
      lower.includes('.ppt') ||
      lower.includes('.pptx') ||
      lower.includes('.doc') ||
      lower.includes('.docx') ||
      lower.includes('/raw/upload/')
    ) {
      return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=false`;
    }
    return url;
  };

  const handleSearchOpenLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookQuery.trim()) return;
    setIsSearchingBooks(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(bookQuery)}&limit=5`
      );
      const data = await res.json();
      setBookResults(data.docs || []);
    } catch (err) {
      console.error('Open Library API Error:', err);
    } finally {
      setIsSearchingBooks(false);
    }
  };

  const handleSaveBookFromOpenLibrary = async (book: OpenLibraryBook) => {
    const bookTitle = `${book.title} ${book.author_name ? `by ${book.author_name[0]}` : ''}`;
    const bookUrl = `https://openlibrary.org${book.key}`;

    try {
      const res = await fetch('/api/admin/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookTitle,
          file_url: bookUrl,
          category_id: 4,
          course_id: 1,
          uploaded_by: 1,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchMaterials();
      } else {
        alert(`Error saving book: ${data.error}`);
      }
    } catch (err) {
      console.error('Save Book Error:', err);
    } finally {
      setShowOpenLibraryModal(false);
      setBookQuery('');
      setBookResults([]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadType === 'file' && !selectedFile) {
      alert('Please select a file to upload.');
      return;
    }
    if (uploadType === 'link' && !externalUrl.trim()) {
      alert('Please enter a valid link/URL.');
      return;
    }

    setIsUploading(true);
    const displayTitle =
      title.trim() ||
      (uploadType === 'file' ? selectedFile?.name || 'Uploaded File' : 'External Link Material');

    try {
      let res;
      if (uploadType === 'link') {
        res = await fetch('/api/admin/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: displayTitle,
            file_url: externalUrl.trim(),
            category_id: selectedCategoryId,
            course_id: 1,
            uploaded_by: 1,
          }),
        });
      } else {
        const formData = new FormData();
        if (selectedFile) formData.append('file', selectedFile);
        formData.append('title', displayTitle);
        formData.append('category_id', String(selectedCategoryId));

        res = await fetch('/api/admin/materials', {
          method: 'POST',
          body: formData,
        });
      }

      const data = await res.json();
      if (data.success) {
        await fetchMaterials();
        setTitle('');
        setExternalUrl('');
        setSelectedFile(null);
        setShowUploadModal(false);
      } else {
        alert(`Upload Failed: ${data.error || 'Server error standard'}`);
      }
    } catch (err: any) {
      console.error('Submission Error:', err);
      alert(`Submission Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return 'External Link';
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const getCategoryDot = (catName: string) => {
    const name = (catName || '').toLowerCase();
    if (name.includes('slide')) return 'bg-yellow-400';
    if (name.includes('lab') || name.includes('manual')) return 'bg-red-500';
    if (name.includes('syllabus')) return 'bg-blue-500';
    if (name.includes('ref') || name.includes('book')) return 'bg-emerald-500';
    return 'bg-gray-400';
  };

  // ==========================================
  // 2. CLASS ROUTINE STATE & HANDLERS
  // ==========================================
  const [userRole, setUserRole] = useState<'lecturer' | 'student'>('student');
  const [selectedCourse, setSelectedCourse] = useState<string>('CSE471-01');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditRoutineModal, setShowEditRoutineModal] = useState(false);
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
    try {
      const res = await fetch('/api/admin/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ASSIGN_LECTURER',
          initials: newInitials.toUpperCase(),
          course_sec: selectedCourse,
        }),
      });
      const data = await res.json();
      if (data.success) await fetchRoutinesAndAssignments();
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
      if (data.success) await fetchRoutinesAndAssignments();
    } catch (err) {
      console.error('Failed to save student assignment:', err);
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
      [day]: {
        ...prev[day],
        [field]: value,
      },
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
      if (data.success) await fetchRoutinesAndAssignments();
    } catch (err) {
      console.error('Failed to save routine:', err);
    }
    setShowEditRoutineModal(false);
  };

  // ==========================================
  // 3. ASSIGNMENT CHECKER & AUDIT GUARD STATE
  // ==========================================
  const [submissionId, setSubmissionId] = useState('1');
  const [originalText, setOriginalText] = useState('');
  const [correctedHtml, setCorrectedHtml] = useState('');
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const handleOpenScript = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`);
      if (!res.ok) throw new Error('Failed to load submission');

      const data = await res.json();
      setOriginalText(data.originalText || '');
      setCorrectedHtml(data.correctedHtml || data.originalText || '');
      setGrade(data.grade || '');
      setFeedback(data.feedback || '');

      alert(`Loaded submission #${submissionId}! Audit log recorded.`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndReturn = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correctedHtml,
          feedback,
          grade,
          tutorId: 'tut_1',
          tutorName: 'Dr. Aris (TA)',
          returnToStudent: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to save review');

      alert('Successfully saved to database!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshReceipt = async () => {
    if (!submissionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/submissions/${submissionId}`);
      if (!res.ok) throw new Error('Submission record not found');

      const data = await res.json();
      setReceipt(data);
    } catch (err: any) {
      alert(err.message);
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
    fetchRoutinesAndAssignments();
  }, []);

  const currentRoutine = routineMap[selectedCourse] || [];
  const filteredLecturers = lecturerAssignments.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.initials.toLowerCase().includes(q) || item.courseSec.toLowerCase().includes(q);
  });
  const filteredStudents = studentAssignments.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.studentId.toLowerCase().includes(q) || item.courseSec.toLowerCase().includes(q);
  });
  const selectedCourseSeats = studentAssignments.find((a) => a.courseSec === selectedCourse)?.seatsRemaining ?? 30;

  return (
    <div className="min-h-screen bg-[#383838] text-gray-100 flex flex-col font-sans">
      {/* Top Navbar Header */}
      <header className="bg-[#384364] px-6 py-3 flex items-center justify-between border-b border-gray-600">
        <div className="flex items-center gap-4">
          <button className="p-1 rounded bg-[#4C5880] hover:bg-slate-600">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-xl font-bold tracking-wide text-white">Class connect</span>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('routine')}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'routine'
                ? 'bg-[#596898] border border-slate-300 text-white font-semibold'
                : 'bg-[#4C5880] border border-slate-400 text-gray-200 hover:bg-slate-600'
            }`}
          >
            Routine
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-[#596898] border border-slate-300 text-white font-semibold'
                : 'bg-[#4C5880] border border-slate-400 text-gray-200 hover:bg-slate-600'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveTab('checker')}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'checker'
                ? 'bg-blue-600 border border-blue-400 text-white font-semibold'
                : 'bg-[#4C5880] border border-slate-400 text-gray-200 hover:bg-slate-600'
            }`}
          >
            Assignment Checker
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === 'audit'
                ? 'bg-emerald-600 border border-emerald-400 text-white font-semibold'
                : 'bg-[#4C5880] border border-slate-400 text-gray-200 hover:bg-slate-600'
            }`}
          >
            Audit Guard
          </button>
        </div>
      </header>

      {/* Sub-header Banner */}
      <div className="bg-[#2D3550] px-6 py-2.5 flex items-center justify-between text-white shadow-md">
        <button className="text-xl font-bold px-2 hover:opacity-80">‹</button>
        <h1 className="text-xl font-serif text-slate-200 tracking-wide">
          {activeTab === 'routine' && 'Class Schedule & Routine Map'}
          {activeTab === 'notes' && 'Notes and Materials'}
          {activeTab === 'checker' && 'Assignment Checker (Student Tutors)'}
          {activeTab === 'audit' && 'Academic Assignment Audit Log & Submission Guard'}
        </h1>
        {activeTab === 'routine' ? (
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
        ) : (
          <div className="w-6"></div>
        )}
      </div>

      {/* Main Content Render */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto relative">
        {/* ================= NOTES & MATERIALS VIEW ================= */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="bg-[#3B3B3B] rounded-2xl overflow-hidden border border-gray-600 shadow-xl max-w-4xl mx-auto">
              <table className="w-full text-left text-xs text-gray-200 border-collapse">
                <thead className="bg-[#484848] text-gray-300 border-b border-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-6 border-r border-gray-600">Resource Name</th>
                    <th className="py-3 px-6 border-r border-gray-600">Category</th>
                    <th className="py-3 px-6 border-r border-gray-600">Size / Source</th>
                    <th className="py-3 px-6">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-600">
                  {materials.map((m) => (
                    <tr key={m.material_id} className="hover:bg-[#434343] transition-colors">
                      <td className="py-3 px-6 border-r border-gray-600 underline cursor-pointer text-gray-200 hover:text-white">
                        <a href={getBrowserViewableUrl(m.file_url)} target="_blank" rel="noreferrer">
                          {m.title} ↗
                        </a>
                      </td>
                      <td className="py-3 px-6 border-r border-gray-600">
                        <div className="flex items-center justify-between">
                          <span>{m.category_name || 'Lecture Slides'}</span>
                          <span className={`w-3 h-3 rounded-full ${getCategoryDot(m.category_name)}`}></span>
                        </div>
                      </td>
                      <td className="py-3 px-6 border-r border-gray-600 text-gray-300">
                        {formatFileSize(m.file_size_bytes)}
                      </td>
                      <td className="py-3 px-6 text-gray-300">
                        {new Date(m.created_at || Date.now()).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                  {materials.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-400">
                        No course materials uploaded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => setShowOpenLibraryModal(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 transition text-sm"
              >
                <span>📚</span> Search Open Library API
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-gray-200 hover:bg-white text-gray-900 font-semibold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2 transition text-sm"
              >
                <span className="text-xl font-bold">+</span> Add Material / Link
              </button>
            </div>
          </div>
        )}

        {/* ================= CLASS ROUTINE VIEW ================= */}
        {activeTab === 'routine' && (
          <div className="flex gap-6 w-full">
            {/* Left Section Picker */}
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

            {/* Right Schedules & Maps */}
            <div className="flex-1 flex flex-col gap-6">
              <div className="bg-[#8C8C8C] text-gray-900 rounded-3xl p-6 shadow-xl border border-gray-500 relative">
                <h2 className="text-center text-xl font-bold font-serif mb-4">
                  {userRole === 'lecturer' ? 'Lecturer Map' : "Student's Schedule Map"}
                </h2>

                <div className="flex justify-end mb-4">
                  <input
                    type="text"
                    placeholder={userRole === 'lecturer' ? 'Search lecturer...' : 'Search Student ID...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 py-1.5 px-4 rounded-full bg-white text-xs border border-gray-400 text-gray-800"
                  />
                </div>

                <div className="bg-gray-200/90 rounded-xl overflow-hidden border border-gray-400 max-w-lg mx-auto">
                  {userRole === 'lecturer' ? (
                    <table className="w-full text-xs text-center border-collapse">
                      <thead className="bg-gray-300 border-b border-gray-400 font-bold text-gray-700">
                        <tr>
                          <th className="py-2 border-r border-gray-400">Fac Initials</th>
                          <th className="py-2">Courses & Sec</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300">
                        {filteredLecturers.map((row) => (
                          <tr key={row.id}>
                            <td className="py-2 border-r border-gray-400 font-semibold">{row.initials}</td>
                            <td className="py-2">{row.courseSec}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-xs text-center border-collapse">
                      <thead className="bg-gray-300 border-b border-gray-400 font-bold text-gray-700">
                        <tr>
                          <th className="py-2 border-r border-gray-400">Student ID</th>
                          <th className="py-2 border-r border-gray-400">Course & Sec</th>
                          <th className="py-2">Seats Left</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300">
                        {filteredStudents.map((row) => (
                          <tr key={row.id}>
                            <td className="py-2 border-r border-gray-400 font-semibold">{row.studentId}</td>
                            <td className="py-2 border-r border-gray-400">{row.courseSec}</td>
                            <td className="py-2">{row.seatsRemaining}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow"
                  >
                    + Assign {userRole === 'lecturer' ? 'Lecturer' : 'Student'} to {selectedCourse}
                  </button>
                  <span className="text-xs font-bold text-gray-800">
                    Remaining Seats: {selectedCourseSeats}
                  </span>
                </div>
              </div>

              {/* Weekly Schedule Display Card */}
              <div className="bg-[#5C5C5C] rounded-3xl p-6 shadow-xl border border-gray-500">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold font-serif text-white">
                    Weekly Schedule ({selectedCourse})
                  </h3>
                  <button
                    onClick={openEditRoutineModal}
                    className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow"
                  >
                    Edit Routine
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-xs">
                  {days.map((day) => {
                    const slot = currentRoutine.find((s) => s.day === day);
                    return (
                      <div key={day} className="bg-[#424242] p-3 rounded-xl border border-gray-600">
                        <span className="block font-bold text-indigo-300 mb-1">{day}</span>
                        {slot ? (
                          <>
                            <p className="text-white font-medium">{slot.time}</p>
                            <p className="text-gray-400 text-[10px] mt-1">{slot.room}</p>
                          </>
                        ) : (
                          <p className="text-gray-500 italic">No class</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ASSIGNMENT CHECKER VIEW ================= */}
        {activeTab === 'checker' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {/* Top Controls */}
            <div className="flex gap-2">
              <input
                type="text"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
                className="border p-2 rounded w-20 text-black bg-white"
                placeholder="ID"
              />
              <button
                onClick={handleOpenScript}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-semibold transition"
              >
                {loading ? 'Loading...' : '1. Open Script (Logs Audit Entry)'}
              </button>
            </div>

            {/* Top Box */}
            <div>
              <label className="block text-sm font-bold mb-1">Original Student Submission Text</label>
              <textarea
                readOnly
                value={originalText}
                placeholder="Click '1. Open Script' above to load submission..."
                className="w-full h-32 p-3 border border-gray-700 rounded bg-gray-900 text-white text-sm outline-none"
              />
            </div>

            {/* Middle Box */}
            <div>
              <label className="block text-sm font-bold mb-1">Annotated / Corrected Script</label>
              <textarea
                value={correctedHtml}
                onChange={(e) => setCorrectedHtml(e.target.value)}
                placeholder="Type tutor annotations or corrections here..."
                className="w-full h-32 p-3 border border-gray-700 rounded bg-gray-900 text-white text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* Grade & Save Button */}
            <div className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="e.g. 85/100"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="border p-2 rounded w-1/3 text-black bg-white"
              />
              <button
                onClick={handleSaveAndReturn}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded font-bold w-2/3 transition"
              >
                {loading ? 'Saving...' : 'Save & Return to Student'}
              </button>
            </div>

            {/* Bottom Box */}
            <div>
              <label className="block text-sm font-bold mb-1">Feedback Notes</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add feedback for the student..."
                className="w-full h-24 p-3 border border-gray-700 rounded bg-gray-900 text-white text-sm outline-none"
              />
            </div>
          </div>
        )}

        {/* ================= AUDIT GUARD VIEW ================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
                placeholder="ID"
                className="bg-white px-4 py-2 rounded text-black border border-gray-400 outline-none text-sm w-24 font-mono text-center"
              />
              <button
                onClick={handleRefreshReceipt}
                disabled={loading}
                className="bg-[#2a3447] hover:bg-[#37455e] text-slate-200 px-5 py-2 rounded-md text-sm font-medium transition"
              >
                {loading ? 'Fetching...' : '2. Refresh Audit Receipt'}
              </button>
            </div>

            <div className="bg-[#282C35] p-6 rounded-xl border border-[#3A3F4B]">
              <p className="text-xs text-gray-400 italic mb-4">
                Automated logging database monitoring assignment boxes. Records precise timestamp signatures for files uploaded by students or opened by student tutors, generating clean audit receipts to verify submission integrity and resolve lateness disputes.
              </p>

              {receipt ? (
                <div className="font-mono text-xs space-y-3 bg-[#1E2129] p-4 rounded-lg border border-[#3A3F4B]">
                  <p><strong className="text-gray-400">Receipt Hash:</strong> <span className="text-emerald-400">{receipt.receiptHash || receipt.hash || 'N/A'}</span></p>
                  <p><strong className="text-gray-400">Student:</strong> {receipt.studentName || receipt.student_name || 'N/A'}</p>
                  <p>
                    <strong className="text-gray-400">Timeliness Integrity:</strong>{' '}
                    <span className={receipt.timeliness === 'LATE SUBMISSION' || receipt.isLate ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {receipt.timeliness || (receipt.isLate ? 'LATE SUBMISSION' : 'ON TIME')}
                    </span>
                  </p>
                  <p><strong className="text-gray-400">Current Status:</strong> <span className="uppercase">{receipt.status || 'N/A'}</span></p>

                  <div className="mt-4 border-t border-[#3A3F4B] pt-4">
                    <h4 className="font-bold text-gray-300 mb-2">Automated Custody Chain Logs:</h4>
                    {receipt.logs && receipt.logs.length > 0 ? (
                      receipt.logs.map((log: any, idx: number) => (
                        <div key={idx} className="bg-[#262A34] p-2.5 rounded mb-2 flex justify-between border border-[#3A3F4B]">
                          <span>{(log.action || '').toUpperCase()} by {log.user_name || log.userName} ({log.user_role || log.userRole})</span>
                          <span className="text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No audit logs recorded for this ID.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Enter a Submission ID above and click "2. Refresh Audit Receipt".</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ================= MODALS ================= */}
      {/* 1. Open Library Books API Modal */}
      {showOpenLibraryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#D1D5DB] text-gray-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border-2 border-emerald-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">Search Books (Open Library API)</h2>
              <button onClick={() => setShowOpenLibraryModal(false)} className="text-xl font-bold text-gray-600">×</button>
            </div>
            <form onSubmit={handleSearchOpenLibrary} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search reference book..."
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                className="flex-1 p-2.5 rounded-xl border border-gray-400 text-sm bg-white text-gray-900"
              />
              <button type="submit" className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700">
                {isSearchingBooks ? 'Searching...' : 'Search'}
              </button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {bookResults.map((book) => (
                <div key={book.key} className="p-3 bg-white rounded-xl border border-gray-300 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{book.title}</p>
                    <p className="text-xs text-gray-600">{book.author_name ? book.author_name.join(', ') : 'Unknown Author'}</p>
                  </div>
                  <button onClick={() => handleSaveBookFromOpenLibrary(book)} className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-semibold">
                    + Add Reference
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Material / Link Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#D8D8D8] text-gray-900 rounded-3xl p-8 max-w-xl w-full relative shadow-2xl border-4 border-sky-400">
            <div className="flex items-center mb-4 relative">
              <button onClick={() => setShowUploadModal(false)} className="text-2xl font-bold text-gray-700 absolute left-0 hover:opacity-75">‹</button>
              <h2 className="text-xl font-bold text-gray-800 tracking-wide w-full text-center uppercase">ADD COURSE MATERIAL</h2>
            </div>
            <div className="flex justify-center gap-3 mb-4">
              <button
                type="button"
                onClick={() => setUploadType('file')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${uploadType === 'file' ? 'bg-[#384364] text-white shadow' : 'bg-gray-300 text-gray-700'}`}
              >
                Upload File (PDF/PPT)
              </button>
              <button
                type="button"
                onClick={() => setUploadType('link')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${uploadType === 'link' ? 'bg-[#384364] text-white shadow' : 'bg-gray-300 text-gray-700'}`}
              >
                Paste URL / Link
              </button>
            </div>
            <div className="bg-[#EAEAEA] rounded-2xl p-6 border-2 border-dashed border-gray-400 text-center mb-6">
              <input
                type="text"
                placeholder="Document / Lecture Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full max-w-md mx-auto p-2 rounded-xl border border-gray-300 text-xs bg-white text-gray-900 mb-3 text-center"
              />
              {uploadType === 'file' ? (
                <>
                  <p className="text-gray-800 font-medium text-sm mb-1">Choose a file or drag and drop it here</p>
                  <p className="text-gray-500 text-xs mb-4">JPEG, PNG, PDF and PPT, Upto 50MB</p>
                  <input type="file" ref={fileInputRef} accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white border border-gray-400 text-gray-800 text-xs font-semibold px-4 py-2 rounded-xl">
                    {selectedFile ? `Selected: ${selectedFile.name}` : 'Choose File'}
                  </button>
                </>
              ) : (
                <div className="w-full max-w-md mx-auto">
                  <p className="text-gray-800 font-medium text-sm mb-2">Enter Google Drive, YouTube, or Zoom Link</p>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 text-xs bg-white text-gray-900"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-8 text-center">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl ${selectedCategoryId === cat.id ? 'bg-white shadow-md border-2 border-sky-500' : ''}`}
                >
                  <span className={`w-4 h-4 rounded-full ${cat.color} mb-1`}></span>
                  <span className="text-xs font-semibold text-gray-800">{cat.name}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              <button onClick={handleUploadSubmit} disabled={isUploading} className="bg-[#6B7280] hover:bg-gray-700 text-white font-medium px-16 py-3 rounded-full text-base shadow">
                {isUploading ? 'Saving...' : 'Save Material'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Routine Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#D8D8D8] text-gray-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border-4 border-indigo-500">
            <h3 className="text-lg font-bold mb-4 text-center">
              Assign {userRole === 'lecturer' ? 'Lecturer Initials' : 'Student ID'} to {selectedCourse}
            </h3>
            {assignError && <p className="text-red-600 text-xs mb-3 text-center font-bold">{assignError}</p>}
            <form onSubmit={userRole === 'lecturer' ? handleLecturerAssignSubmit : handleStudentAssignSubmit} className="space-y-4">
              {userRole === 'lecturer' ? (
                <input
                  type="text"
                  placeholder="Lecturer Initials (e.g. MRA)"
                  value={newInitials}
                  onChange={(e) => setNewInitials(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-400 text-sm bg-white text-gray-900"
                />
              ) : (
                <input
                  type="text"
                  placeholder="Student ID (e.g. 21101234)"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-400 text-sm bg-white text-gray-900"
                />
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button type="submit" className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700">
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Routine Edit Schedule Modal */}
      {showEditRoutineModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#D8D8D8] text-gray-900 rounded-3xl p-6 max-w-xl w-full shadow-2xl border-4 border-sky-500 max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-center">Edit Weekly Slots for {selectedCourse}</h3>
            <form onSubmit={handleSaveRoutine} className="space-y-3">
              {days.map((day) => (
                <div key={day} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-300">
                  <span className="w-12 font-bold text-xs text-indigo-700">{day}</span>
                  <input
                    type="text"
                    placeholder="Time (e.g. 09:30 AM - 10:50 AM)"
                    value={weeklyScheduleForm[day]?.time || ''}
                    onChange={(e) => handleDayInputChange(day, 'time', e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-gray-300 text-xs bg-gray-50 text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="Room (e.g. UB20401)"
                    value={weeklyScheduleForm[day]?.room || ''}
                    onChange={(e) => handleDayInputChange(day, 'room', e.target.value)}
                    className="w-32 p-2 rounded-lg border border-gray-300 text-xs bg-gray-50 text-gray-900"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowEditRoutineModal(false)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button type="submit" className="bg-sky-600 text-white px-6 py-2 rounded-xl text-xs font-semibold hover:bg-sky-700">
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}