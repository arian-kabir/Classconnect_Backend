'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Routine' | 'Notes' | 'Chat'>('Routine');
  const [showRemainder, setShowRemainder] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#002626] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-[#404848]">Loading Academic Portal...</p>
        </div>
      </div>
    );
  }

  const user = session?.user as any;
  const userName = user?.name || 'Dr. Sarah Chen';
  const userRole = user?.role === 'teacher' ? 'Lead Instructor' : (user?.role === 'admin' ? 'System Administrator' : (user?.role === 'student_tutor' ? 'Student Tutor' : 'Lead Instructor'));

  return (
    <div className="min-h-screen flex bg-[#f8f9fa] text-[#191c1d] font-sans selection:bg-[#002626] selection:text-white">
      {/* =========================================================
          LEFT SIDEBAR: COURSE NAVIGATOR
          ========================================================= */}
      <aside className="w-64 bg-[#f3f4f5] border-r border-[#e5e7eb] flex flex-col flex-shrink-0 min-h-screen">
        {/* Sidebar Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#e5e7eb]">
          <svg className="w-5 h-5 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
          </svg>
          <span className="font-bold text-base text-[#191c1d] tracking-tight">Course Navigator</span>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 py-6 flex flex-col gap-6">
          {/* Section: My Courses */}
          <div>
            <h3 className="px-6 text-[11px] font-bold uppercase tracking-wider text-[#707978] mb-3">
              My Courses
            </h3>
            <nav className="flex flex-col gap-1 px-3">
              <Link
                href="#"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#404848] hover:text-[#002626] hover:bg-[#e7e9ea] transition-all group"
              >
                <span className="w-5 flex justify-center text-xs font-mono font-bold text-[#707978] group-hover:text-[#002626]">&lt;&gt;</span>
                <span>CS101: Programming</span>
              </Link>

              <Link
                href="#"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#404848] hover:text-[#002626] hover:bg-[#e7e9ea] transition-all group"
              >
                <svg className="w-4 h-4 text-[#707978] group-hover:text-[#002626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M3 9h2m-2 6h2m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                <span>CSE471: Architecture</span>
              </Link>

              <Link
                href="#"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#404848] hover:text-[#002626] hover:bg-[#e7e9ea] transition-all group"
              >
                <span className="w-5 flex justify-center text-sm font-serif font-bold text-[#707978] group-hover:text-[#002626]">Σ</span>
                <span>MAT202: Calculus</span>
              </Link>
            </nav>
          </div>

          {/* Section: Resources */}
          <div>
            <h3 className="px-6 text-[11px] font-bold uppercase tracking-wider text-[#707978] mb-3">
              Resources
            </h3>
            <nav className="flex flex-col gap-1 px-3">
              <Link
                href="#"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#404848] hover:text-[#002626] hover:bg-[#e7e9ea] transition-all group"
              >
                <svg className="w-4 h-4 text-[#707978] group-hover:text-[#002626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
                <span>Digital Library</span>
              </Link>
            </nav>
          </div>
        </div>
      </aside>

      {/* =========================================================
          MAIN PORTAL CONTENT AREA
          ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 px-8 bg-white border-b border-[#e5e7eb] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-8">
            <h1 className="font-bold text-base md:text-lg text-[#191c1d] tracking-tight">
              ClassConnect: Academic Portal
            </h1>
          </div>


          {/* Center Tabs & Profile */}
          <div className="flex items-center gap-8">

            {/* Profile Info */}
            <div className="flex items-center gap-3 pl-4 border-l border-[#e5e7eb]">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[#191c1d] leading-none">{userName}</p>
                <p className="text-xs text-[#707978] mt-1">{userRole}</p>
              </div>

              {user?.image ? (
                <img src={user.image} alt={userName} className="w-10 h-10 rounded-full border border-[#c0c8c7] object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#dbe5df] border border-[#c0c8c7] flex items-center justify-center text-sm font-bold text-[#002626]">
                  {userName.charAt(0)}
                </div>
              )}

        {/* Page Main Content */}
        <main className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
          {/* =========================================================
              1. 4 ACTION / MODULE CARDS
              ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Class Schedule */}
            <div className="bg-[#e5ece8] rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer group min-h-[190px]">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-semibold text-sm text-[#191c1d]">Class Schedule</span>
            </div>

            {/* Card 2: Canvas */}
            <div className="bg-[#e5ece8] rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer group min-h-[190px]">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="font-semibold text-sm text-[#191c1d]">Notes and Material</span>
            </div>

            {/* Card 3: Notes and Material */}
            <Link
              href="/Canvas"
              className="bg-[#e5ece8] rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer group min-h-[190px]"
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="font-semibold text-sm text-[#191c1d]">Canvas</span>
            </Link>

            {/* Card 4: Group Chats */}
            <Link
              href="/chat"
              className="bg-[#e5ece8] rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer group min-h-[190px]"
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="font-semibold text-sm text-[#191c1d]">Group Chats</span>
            </Link>
          </div>
          {/* =========================================================
              2. REMAINDER BOARD BANNER
              ========================================================= */}
          {showRemainder && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#707978] mb-3">
                Remainder Board
              </h2>
              <div className="bg-[#ebeded] rounded-xl px-5 py-4 flex items-center justify-between border border-[#d9dadb]">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] flex-shrink-0" />
                  <p className="text-sm">
                    <span className="font-bold text-[#191c1d]">CSE471 - section - 1:</span>{' '}
                    <span className="text-[#404848]">Assignment 2 - pending - last date: 12/7/24 11am</span>
                  </p>
                </div>
                <button
                  onClick={() => setShowRemainder(false)}
                  className="text-[#707978] hover:text-[#191c1d] transition-colors p-1"
                  aria-label="Dismiss remainder"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================
              3. STAFFING & ALLOCATION LEDGER (DATA TABLE)
              ========================================================= */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm overflow-hidden">
            {/* Ledger Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-[#e5e7eb]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#f3f4f5] border border-[#e5e7eb] flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <h2 className="font-bold text-sm md:text-base text-[#191c1d]">
                  Staffing & Allocation Ledger
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#c0c8c7] rounded-lg text-xs font-semibold text-[#191c1d] bg-white hover:bg-[#f3f4f5] transition-all">
                  <svg className="w-3.5 h-3.5 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                </button>
                <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#002626] hover:bg-[#003d3d] transition-all shadow-sm">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Allocations
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-white">
                    <th className="px-6 py-4 text-xs font-bold text-[#707978]">Course Segment</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#707978]">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#707978]">Primary Instructor</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#707978]">Support Staff</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#707978]">Enrollment</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#707978]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb]">
                  {/* Row 1 */}
                  <tr className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-[#191c1d]">CS101 - Intro to Programming</p>
                      <p className="text-xs text-[#707978] mt-0.5">Section A • Mon/Wed 10:00 AM</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 rounded bg-[#e2ede6] text-[#2c4e3f] text-[10px] font-bold uppercase tracking-wider">
                        LECTURE
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#dbe5df] border border-[#c0c8c7] flex items-center justify-center text-xs font-bold text-[#002626]">
                          AT
                        </div>
                        <span className="text-sm font-medium text-[#191c1d]">Dr. A. Turing</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center -space-x-1.5">
                        <div className="w-6 h-6 rounded-full bg-[#e1e3e4] border border-white flex items-center justify-center text-[9px] font-bold text-[#404848]">
                          TA
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#e1e3e4] border border-white flex items-center justify-center text-[9px] font-bold text-[#404848]">
                          LA
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#002626] border border-white flex items-center justify-center text-[9px] font-bold text-white">
                          +1
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-sm text-[#191c1d]">120</span>
                      <span className="text-xs text-[#707978]"> / 150</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e3f4e8] text-[#15803d] text-xs font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Synced
                      </span>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-sm text-[#191c1d]">CS101 - Lab Group 1</p>
                      <p className="text-xs text-[#707978] mt-0.5">Lab • Fri 2:00 PM</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 rounded bg-[#e2ede6] text-[#2c4e3f] text-[10px] font-bold uppercase tracking-wider">
                        LAB
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[#707978] text-xs font-semibold text-[#404848] hover:bg-[#f3f4f5] transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Assign
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-6 h-6 rounded-full bg-[#f3f4f5] border border-dashed border-[#707978] flex items-center justify-center text-[10px] font-bold text-[#707978]">
                        ?
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-sm text-[#191c1d]">28</span>
                      <span className="text-xs text-[#707978]"> / 30</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fee2e2] text-[#dc2626] text-xs font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Conflict
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
