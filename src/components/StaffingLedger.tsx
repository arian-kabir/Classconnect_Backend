'use client';

/**
 * src/components/StaffingLedger.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-Role Section Staffing & Allocation Ledger
 * (Module 2 — Faria Fairooz Zahan)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useMemo } from 'react';

export interface StaffMember {
  userId: number;
  fullName: string;
  email: string;
  role: 'teacher' | 'student_tutor' | 'student' | 'admin';
  staffRoleType: 'primary_instructor' | 'teaching_assistant' | 'lab_assistant' | 'student_tutor';
  initials: string;
  profilePicture?: string | null;
}

export interface SectionScheduleInfo {
  scheduleId?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
}

export interface SectionLedgerRow {
  sectionId: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  credits: number;
  departmentName?: string;
  sectionCode: string;
  semester: string;
  year: number;
  sectionType: 'LECTURE' | 'LAB' | 'TUTORIAL' | 'COMBINED';
  maxStudents: number;
  enrolledCount: number;
  primaryInstructor: StaffMember | null;
  supportStaff: StaffMember[];
  schedules: SectionScheduleInfo[];
  status: 'synced' | 'conflict' | 'unassigned' | 'warning';
  statusReason?: string;
  lastSyncedAt?: string | null;
}

interface StaffPoolItem {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  initials: string;
  profilePicture?: string | null;
}

export default function StaffingLedger() {
  const [ledger, setLedger] = useState<SectionLedgerRow[]>([]);
  const [staffPool, setStaffPool] = useState<StaffPoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Track pending unsaved changes: map sectionId -> modified row
  const [dirtySections, setDirtySections] = useState<Set<number>>(new Set());

  // Modals state
  const [editingInstructorSection, setEditingInstructorSection] = useState<SectionLedgerRow | null>(null);
  const [editingSupportSection, setEditingSupportSection] = useState<SectionLedgerRow | null>(null);
  const [editingCapacitySection, setEditingCapacitySection] = useState<SectionLedgerRow | null>(null);
  const [newCapacityValue, setNewCapacityValue] = useState<number>(30);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ledgerRes, staffRes] = await Promise.all([
        fetch('/api/allocations'),
        fetch('/api/allocations/staff-pool'),
      ]);

      if (!ledgerRes.ok) throw new Error('Failed to load allocations data');
      if (!staffRes.ok) throw new Error('Failed to load staff pool');

      const ledgerJson = await ledgerRes.json();
      const staffJson = await staffRes.json();

      setLedger(ledgerJson.ledger || []);
      setStaffPool(staffJson.staffPool || []);
      setDirtySections(new Set());
    } catch (err: any) {
      console.error('Error fetching allocations ledger:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered rows
  const filteredLedger = useMemo(() => {
    return ledger.filter((row) => {
      const matchesSearch =
        row.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.primaryInstructor && row.primaryInstructor.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (row.departmentName && row.departmentName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSemester = semesterFilter === 'All' || row.semester.toLowerCase() === semesterFilter.toLowerCase();
      const matchesStatus = statusFilter === 'All' || row.status === statusFilter.toLowerCase();

      return matchesSearch && matchesSemester && matchesStatus;
    });
  }, [ledger, searchQuery, semesterFilter, statusFilter]);

  // Primary Instructor assignment handler
  const handleAssignInstructor = (sectionId: number, instructor: StaffPoolItem | null) => {
    setLedger((prev) =>
      prev.map((row) => {
        if (row.sectionId !== sectionId) return row;

        const newInstructor: StaffMember | null = instructor
          ? {
              userId: instructor.userId,
              fullName: instructor.fullName,
              email: instructor.email,
              role: instructor.role as any,
              staffRoleType: 'primary_instructor',
              initials: instructor.initials,
              profilePicture: instructor.profilePicture,
            }
          : null;

        // Recalculate status
        let newStatus: SectionLedgerRow['status'] = 'synced';
        let reason = 'Staffing synchronized';
        if (!newInstructor) {
          newStatus = 'unassigned';
          reason = 'No primary instructor assigned';
        } else if (row.enrolledCount > row.maxStudents) {
          newStatus = 'conflict';
          reason = `Enrollment (${row.enrolledCount}) exceeds max capacity (${row.maxStudents})`;
        } else if (row.schedules.length === 0) {
          newStatus = 'warning';
          reason = 'No timetable slots scheduled';
        }

        return {
          ...row,
          primaryInstructor: newInstructor,
          status: newStatus,
          statusReason: reason,
        };
      })
    );

    setDirtySections((prev) => new Set(prev).add(sectionId));
    setEditingInstructorSection(null);
  };

  // Support staff add / remove handlers
  const handleToggleSupportStaff = (
    sectionId: number,
    staffUser: StaffPoolItem,
    roleType: 'teaching_assistant' | 'lab_assistant' | 'student_tutor'
  ) => {
    setLedger((prev) =>
      prev.map((row) => {
        if (row.sectionId !== sectionId) return row;

        const exists = row.supportStaff.some((s) => s.userId === staffUser.userId);
        let updatedStaff: StaffMember[];

        if (exists) {
          updatedStaff = row.supportStaff.filter((s) => s.userId !== staffUser.userId);
        } else {
          updatedStaff = [
            ...row.supportStaff,
            {
              userId: staffUser.userId,
              fullName: staffUser.fullName,
              email: staffUser.email,
              role: staffUser.role as any,
              staffRoleType: roleType,
              initials: staffUser.initials,
              profilePicture: staffUser.profilePicture,
            },
          ];
        }

        return {
          ...row,
          supportStaff: updatedStaff,
        };
      })
    );

    setDirtySections((prev) => new Set(prev).add(sectionId));
  };

  // Section segment type toggle
  const handleToggleSegmentType = (sectionId: number) => {
    setLedger((prev) =>
      prev.map((row) => {
        if (row.sectionId !== sectionId) return row;
        const nextType: 'LECTURE' | 'LAB' | 'TUTORIAL' =
          row.sectionType === 'LECTURE' ? 'LAB' : row.sectionType === 'LAB' ? 'TUTORIAL' : 'LECTURE';
        return { ...row, sectionType: nextType };
      })
    );
    setDirtySections((prev) => new Set(prev).add(sectionId));
  };

  // Capacity update handler
  const handleSaveCapacity = (sectionId: number, newCap: number) => {
    setLedger((prev) =>
      prev.map((row) => {
        if (row.sectionId !== sectionId) return row;
        const isConflict = row.enrolledCount > newCap;
        return {
          ...row,
          maxStudents: newCap,
          status: isConflict ? 'conflict' : row.status === 'conflict' ? 'synced' : row.status,
          statusReason: isConflict
            ? `Enrollment (${row.enrolledCount}) exceeds max capacity (${newCap})`
            : row.statusReason,
        };
      })
    );
    setDirtySections((prev) => new Set(prev).add(sectionId));
    setEditingCapacitySection(null);
  };

  // Save changes to backend
  const handleSaveAllocations = async () => {
    if (dirtySections.size === 0) {
      showToast('success', 'Allocations are already up to date!');
      return;
    }

    try {
      setSaving(true);
      const changedRows = ledger.filter((r) => dirtySections.has(r.sectionId));

      const payload = changedRows.map((r) => ({
        sectionId: r.sectionId,
        primaryInstructorId: r.primaryInstructor?.userId || null,
        supportStaff: r.supportStaff.map((s) => ({
          userId: s.userId,
          staffRoleType: s.staffRoleType,
        })),
        sectionType: r.sectionType,
        maxStudents: r.maxStudents,
      }));

      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: payload }),
      });

      if (!res.ok) throw new Error('Failed to save allocations');

      setDirtySections(new Set());
      showToast('success', `Successfully saved allocations for ${changedRows.length} section(s)!`);
      fetchData(); // Refresh clean state
    } catch (err: any) {
      console.error('Error saving allocations:', err);
      showToast('error', err.message || 'Error saving allocations');
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (ledger.length === 0) return;

    const headers = [
      'Course Code',
      'Course Name',
      'Section Code',
      'Type',
      'Semester',
      'Year',
      'Primary Instructor',
      'Primary Email',
      'Support Staff Count',
      'Support Staff Details',
      'Enrolled Students',
      'Max Capacity',
      'Status',
      'Status Reason',
      'Schedule Info',
    ];

    const rows = ledger.map((row) => {
      const instructorName = row.primaryInstructor?.fullName || 'Unassigned';
      const instructorEmail = row.primaryInstructor?.email || 'N/A';
      const supportDetails = row.supportStaff.map((s) => `${s.fullName} (${s.staffRoleType})`).join('; ') || 'None';
      const scheduleDetails =
        row.schedules.map((s) => `${s.dayOfWeek} ${s.startTime}-${s.endTime} (${s.roomNumber})`).join('; ') || 'TBA';

      return [
        `"${row.courseCode}"`,
        `"${row.courseName.replace(/"/g, '""')}"`,
        `"${row.sectionCode}"`,
        `"${row.sectionType}"`,
        `"${row.semester}"`,
        row.year,
        `"${instructorName}"`,
        `"${instructorEmail}"`,
        row.supportStaff.length,
        `"${supportDetails}"`,
        row.enrolledCount,
        row.maxStudents,
        `"${row.status.toUpperCase()}"`,
        `"${row.statusReason || ''}"`,
        `"${scheduleDetails}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ClassConnect_Staffing_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Exported Staffing & Allocation Ledger to CSV');
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden flex flex-col">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`px-6 py-3 text-xs font-semibold flex items-center justify-between border-b transition-all ${
            toastMessage.type === 'success'
              ? 'bg-[#e2ede6] text-[#002626] border-[#c0c8c7]'
              : 'bg-[#fee2e2] text-[#dc2626] border-[#fca5a5]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{toastMessage.type === 'success' ? '✓' : '⚠'}</span>
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-sm font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Ledger Header & Action Bar */}
      <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#002626] text-white flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-[#191c1d] tracking-tight">Staffing & Allocation Ledger</h2>
              {dirtySections.size > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] text-[10px] font-bold animate-pulse">
                  {dirtySections.size} unsaved change{dirtySections.size > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-[#707978]">Cross-role section allocation of faculty, student tutors, and peers</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Refresh */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-[#c0c8c7] rounded-lg text-xs font-semibold text-[#191c1d] bg-white hover:bg-[#f3f4f5] transition-all disabled:opacity-50"
            title="Reload from database"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={ledger.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#c0c8c7] rounded-lg text-xs font-semibold text-[#191c1d] bg-white hover:bg-[#f3f4f5] transition-all shadow-sm disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export CSV
          </button>

          {/* Save Allocations Button */}
          <button
            onClick={handleSaveAllocations}
            disabled={saving || dirtySections.size === 0}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all shadow-sm ${
              dirtySections.size > 0
                ? 'bg-[#002626] hover:bg-[#003d3d] ring-2 ring-[#002626]/30'
                : 'bg-[#51625b] hover:bg-[#404848] opacity-80'
            }`}
          >
            {saving ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                <span>Save Allocations {dirtySections.size > 0 ? `(${dirtySections.size})` : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div className="px-6 py-3 bg-[#f8f9fa] border-b border-[#e5e7eb] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <input
            type="text"
            placeholder="Search by course, code, faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#c0c8c7] rounded-lg text-xs text-[#191c1d] placeholder-[#707978] focus:outline-none focus:ring-1 focus:ring-[#002626]"
          />
          <svg
            className="w-3.5 h-3.5 text-[#707978] absolute left-2.5 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Semester Selector */}
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="bg-white border border-[#c0c8c7] rounded-lg px-2.5 py-1.5 text-xs text-[#191c1d] focus:outline-none focus:ring-1 focus:ring-[#002626]"
          >
            <option value="All">All Semesters</option>
            <option value="Fall">Fall</option>
            <option value="Spring">Spring</option>
            <option value="Summer">Summer</option>
          </select>

          {/* Status Selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#c0c8c7] rounded-lg px-2.5 py-1.5 text-xs text-[#191c1d] focus:outline-none focus:ring-1 focus:ring-[#002626]"
          >
            <option value="All">All Statuses</option>
            <option value="synced">Synced Only</option>
            <option value="conflict">Conflicts Only</option>
            <option value="unassigned">Unassigned Only</option>
          </select>

          <span className="text-[#707978] pl-2 text-[11px]">
            Showing <strong>{filteredLedger.length}</strong> of {ledger.length} sections
          </span>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e5e7eb] bg-white">
              <th className="px-6 py-4 text-xs font-bold text-[#707978]">Course Segment</th>
              <th className="px-6 py-4 text-xs font-bold text-[#707978]">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-[#707978]">Primary Instructor</th>
              <th className="px-6 py-4 text-xs font-bold text-[#707978]">Support Staff (TAs / LAs)</th>
              <th className="px-6 py-4 text-xs font-bold text-[#707978]">Enrollment</th>
              <th className="px-6 py-4 text-xs font-bold text-[#707978]">Status & Conflicts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#707978]">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-[#002626] border-t-transparent rounded-full animate-spin" />
                    <span>Loading Section Staffing Ledger...</span>
                  </div>
                </td>
              </tr>
            ) : filteredLedger.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#707978]">
                  No matching course sections found.
                </td>
              </tr>
            ) : (
              filteredLedger.map((row) => {
                const isModified = dirtySections.has(row.sectionId);
                const scheduleSummary =
                  row.schedules.length > 0
                    ? row.schedules
                        .map((s) => `${s.dayOfWeek.slice(0, 3)} ${s.startTime} • ${s.roomNumber}`)
                        .join(' | ')
                    : 'Schedule TBA';

                return (
                  <tr
                    key={row.sectionId}
                    className={`transition-colors group ${
                      isModified ? 'bg-[#fcfbee] hover:bg-[#f9f7dc]' : 'hover:bg-[#f8f9fa]'
                    }`}
                  >
                    {/* Course Segment */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2.5">
                        {isModified && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#f59e0b] mt-1.5 flex-shrink-0"
                            title="Unsaved modified row"
                          />
                        )}
                        <div>
                          <p className="font-bold text-sm text-[#191c1d]">
                            {row.courseCode} - {row.courseName}
                          </p>
                          <p className="text-xs text-[#707978] mt-0.5">
                            Section <span className="font-semibold text-[#191c1d]">{row.sectionCode}</span> •{' '}
                            {scheduleSummary}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Delivery Type Badge (Interactive toggle) */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleSegmentType(row.sectionId)}
                        className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 ${
                          row.sectionType === 'LAB'
                            ? 'bg-[#e0f2fe] text-[#0369a1] hover:bg-[#bae6fd]'
                            : row.sectionType === 'TUTORIAL'
                            ? 'bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]'
                            : 'bg-[#e2ede6] text-[#2c4e3f] hover:bg-[#cbe0d3]'
                        }`}
                        title="Click to toggle segment type (Lecture/Lab/Tutorial)"
                      >
                        {row.sectionType}
                      </button>
                    </td>

                    {/* Primary Instructor */}
                    <td className="px-6 py-4">
                      {row.primaryInstructor ? (
                        <div className="flex items-center justify-between gap-3 group/inst">
                          <div className="flex items-center gap-2.5">
                            {row.primaryInstructor.profilePicture ? (
                              <img
                                src={row.primaryInstructor.profilePicture}
                                alt={row.primaryInstructor.fullName}
                                className="w-7 h-7 rounded-full border border-[#c0c8c7] object-cover"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#dbe5df] border border-[#c0c8c7] flex items-center justify-center text-xs font-bold text-[#002626]">
                                {row.primaryInstructor.initials}
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-medium text-[#191c1d] block leading-tight">
                                {row.primaryInstructor.fullName}
                              </span>
                              <span className="text-[10px] text-[#707978]">
                                {row.primaryInstructor.email.split('@')[0]}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingInstructorSection(row)}
                            className="opacity-0 group-hover/inst:opacity-100 p-1 text-[#707978] hover:text-[#002626] transition-opacity"
                            title="Change instructor"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingInstructorSection(row)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#707978] text-xs font-semibold text-[#404848] hover:bg-[#e2ede6] hover:text-[#002626] hover:border-[#002626] transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                            />
                          </svg>
                          Assign Faculty
                        </button>
                      )}
                    </td>

                    {/* Support Staff (TAs, LAs, Tutors) */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {row.supportStaff.length > 0 ? (
                          <div className="flex items-center -space-x-1.5">
                            {row.supportStaff.slice(0, 3).map((staff, idx) => (
                              <div
                                key={staff.userId || idx}
                                className={`w-6 h-6 rounded-full border border-white flex items-center justify-center text-[9px] font-bold text-white shadow-xs cursor-pointer ${
                                  staff.staffRoleType === 'teaching_assistant'
                                    ? 'bg-[#002626]'
                                    : staff.staffRoleType === 'lab_assistant'
                                    ? 'bg-[#0284c7]'
                                    : 'bg-[#b45309]'
                                }`}
                                title={`${staff.fullName} (${staff.staffRoleType.replace('_', ' ').toUpperCase()})`}
                              >
                                {staff.initials.slice(0, 2)}
                              </div>
                            ))}
                            {row.supportStaff.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-[#404848] border border-white flex items-center justify-center text-[9px] font-bold text-white">
                                +{row.supportStaff.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[#707978] italic">None</span>
                        )}

                        <button
                          onClick={() => setEditingSupportSection(row)}
                          className="p-1 rounded text-[#707978] hover:text-[#002626] hover:bg-[#e2ede6] transition-colors ml-1"
                          title="Manage TAs & Student Tutors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </td>

                    {/* Enrollment vs Max Capacity */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 group/cap">
                        <div>
                          <span
                            className={`font-bold text-sm ${
                              row.enrolledCount > row.maxStudents ? 'text-[#dc2626]' : 'text-[#191c1d]'
                            }`}
                          >
                            {row.enrolledCount}
                          </span>
                          <span className="text-xs text-[#707978]"> / {row.maxStudents}</span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingCapacitySection(row);
                            setNewCapacityValue(row.maxStudents);
                          }}
                          className="opacity-0 group-hover/cap:opacity-100 text-[10px] text-[#707978] hover:text-[#002626] underline ml-1"
                          title="Change capacity"
                        >
                          edit
                        </button>
                      </div>
                    </td>

                    {/* Status & Diagnostic Pill */}
                    <td className="px-6 py-4">
                      {row.status === 'synced' && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e3f4e8] text-[#15803d] text-xs font-semibold"
                          title={row.statusReason || 'Synced and active'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Synced
                        </span>
                      )}

                      {row.status === 'conflict' && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fee2e2] text-[#dc2626] text-xs font-semibold cursor-help"
                          title={row.statusReason || 'Conflict detected'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          Conflict
                        </span>
                      )}

                      {row.status === 'unassigned' && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fef3c7] text-[#b45309] text-xs font-semibold cursor-help"
                          title={row.statusReason || 'No faculty assigned'}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#b45309]" />
                          Unassigned
                        </span>
                      )}

                      {row.status === 'warning' && (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1f5f9] text-[#475569] text-xs font-semibold"
                          title={row.statusReason || 'Schedule not finalized'}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#64748b]" />
                          Pending Schedule
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── MODAL 1: Assign Primary Instructor ───────────────────────────── */}
      {editingInstructorSection && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-[#191c1d]">Assign Primary Instructor</h3>
                <p className="text-xs text-[#707978]">
                  {editingInstructorSection.courseCode} - Section {editingInstructorSection.sectionCode}
                </p>
              </div>
              <button
                onClick={() => setEditingInstructorSection(null)}
                className="text-[#707978] hover:text-[#191c1d] p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {/* Option to clear instructor */}
              <button
                onClick={() => handleAssignInstructor(editingInstructorSection.sectionId, null)}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-[#dc2626]/40 hover:bg-[#fee2e2] text-left transition-all text-[#dc2626]"
              >
                <div className="w-7 h-7 rounded-full bg-[#fee2e2] flex items-center justify-center text-xs font-bold">
                  ✕
                </div>
                <div>
                  <p className="text-xs font-bold">Unassign Current Instructor</p>
                  <p className="text-[10px] text-[#dc2626]/70">Leave section open for later assignment</p>
                </div>
              </button>

              {/* Faculty pool list */}
              {staffPool
                .filter((s) => s.role === 'teacher' || s.role === 'student_tutor')
                .map((faculty) => (
                  <button
                    key={faculty.userId}
                    onClick={() => handleAssignInstructor(editingInstructorSection.sectionId, faculty)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-left ${
                      editingInstructorSection.primaryInstructor?.userId === faculty.userId
                        ? 'border-[#002626] bg-[#e2ede6]'
                        : 'border-[#e5e7eb] hover:bg-[#f8f9fa]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#dbe5df] border border-[#c0c8c7] flex items-center justify-center text-xs font-bold text-[#002626]">
                        {faculty.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#191c1d]">{faculty.fullName}</p>
                        <p className="text-[10px] text-[#707978]">{faculty.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-[#51625b] px-2 py-0.5 rounded bg-[#ebeded]">
                      {faculty.role}
                    </span>
                  </button>
                ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setEditingInstructorSection(null)}
                className="px-4 py-2 border border-[#c0c8c7] rounded-lg text-xs font-semibold text-[#191c1d] hover:bg-[#f3f4f5]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Manage Support Staff (TAs, LAs, Tutors) ─────────────── */}
      {editingSupportSection && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-[#191c1d]">Manage Support Staff & Tutors</h3>
                <p className="text-xs text-[#707978]">
                  {editingSupportSection.courseCode} Section {editingSupportSection.sectionCode} (
                  {editingSupportSection.supportStaff.length} allocated)
                </p>
              </div>
              <button onClick={() => setEditingSupportSection(null)} className="text-[#707978] hover:text-[#191c1d] p-1">
                ✕
              </button>
            </div>

            <p className="text-xs text-[#51625b] mb-3">
              Assign Teaching Assistants (TAs), Lab Assistants (LAs), or Peer Student Tutors to support this section:
            </p>

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {staffPool.map((person) => {
                const assigned = editingSupportSection.supportStaff.find((s) => s.userId === person.userId);
                return (
                  <div
                    key={person.userId}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                      assigned ? 'border-[#002626] bg-[#e2ede6]' : 'border-[#e5e7eb] hover:bg-[#f8f9fa]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#002626] text-white flex items-center justify-center text-xs font-bold">
                        {person.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#191c1d]">{person.fullName}</p>
                        <p className="text-[10px] text-[#707978]">
                          {person.email} • <span className="uppercase font-semibold">{person.role}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {assigned ? (
                        <button
                          onClick={() => handleToggleSupportStaff(editingSupportSection.sectionId, person, 'teaching_assistant')}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-[#dc2626] bg-[#fee2e2] hover:bg-[#fecaca] transition-colors"
                        >
                          Remove
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              handleToggleSupportStaff(editingSupportSection.sectionId, person, 'teaching_assistant')
                            }
                            className="px-2.5 py-1 rounded text-[10px] font-bold text-[#002626] bg-[#e2ede6] hover:bg-[#d0e4d8] transition-colors"
                            title="Add as Teaching Assistant"
                          >
                            + TA
                          </button>
                          <button
                            onClick={() =>
                              handleToggleSupportStaff(editingSupportSection.sectionId, person, 'lab_assistant')
                            }
                            className="px-2.5 py-1 rounded text-[10px] font-bold text-[#0369a1] bg-[#e0f2fe] hover:bg-[#bae6fd] transition-colors"
                            title="Add as Lab Assistant"
                          >
                            + LA
                          </button>
                          <button
                            onClick={() =>
                              handleToggleSupportStaff(editingSupportSection.sectionId, person, 'student_tutor')
                            }
                            className="px-2.5 py-1 rounded text-[10px] font-bold text-[#92400e] bg-[#fef3c7] hover:bg-[#fde68a] transition-colors"
                            title="Add as Student Tutor"
                          >
                            + Tutor
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setEditingSupportSection(null)}
                className="px-4 py-2 bg-[#002626] text-white rounded-lg text-xs font-semibold hover:bg-[#003d3d]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Edit Capacity ───────────────────────────────────────── */}
      {editingCapacitySection && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-xl max-w-xs w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-sm text-[#191c1d] mb-1">Set Maximum Capacity</h3>
            <p className="text-xs text-[#707978] mb-4">
              {editingCapacitySection.courseCode} Section {editingCapacitySection.sectionCode}
            </p>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-[#191c1d]">Max Students</label>
              <input
                type="number"
                min="1"
                max="300"
                value={newCapacityValue}
                onChange={(e) => setNewCapacityValue(parseInt(e.target.value) || 0)}
                className="px-3 py-2 border border-[#c0c8c7] rounded-lg text-sm text-[#191c1d] focus:outline-none focus:ring-2 focus:ring-[#002626]"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingCapacitySection(null)}
                className="px-3 py-1.5 border border-[#c0c8c7] rounded-lg text-xs font-semibold text-[#191c1d] hover:bg-[#f3f4f5]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveCapacity(editingCapacitySection.sectionId, newCapacityValue)}
                className="px-3.5 py-1.5 bg-[#002626] text-white rounded-lg text-xs font-semibold hover:bg-[#003d3d]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
