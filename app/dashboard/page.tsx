'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import RoutineOrchestrator from '@/components/RoutineOrchestrator';
import StaffingLedger from '@/components/StaffingLedger';

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
  const userRole = user?.role === 'teacher' ? 'Lead Instructor' : (user?.role === 'admin' ? 'System Administrator' : (user?.role === 'student' ? 'Student' : 'Student'));

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
                  Resources & Tools
                </h3>
                <nav className="flex flex-col gap-1 px-3">
                  <Link
                    href="/admin/allocations"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#002626] bg-[#e2ede6] hover:bg-[#d0e4d8] transition-all group"
                  >
                    <span className="text-base">📋</span>
                    <span>Staffing Ledger (Admin)</span>
                  </Link>

                  <Link
                    href="/admin"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#404848] hover:text-[#002626] hover:bg-[#e7e9ea] transition-all group"
                  >
                    <span className="text-base">📊</span>
                    <span>Routine Intake (Admin)</span>
                  </Link>

                  <Link
                    href="#"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#404848] hover:text-[#002626] hover:bg-[#e7e9ea] transition-all group mt-1"
                  >
                    <svg className="w-4 h-4 text-[#707978] group-hover:text-[#002626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                    </svg>
                    <span>Digital Library</span>
                  </Link>
                </nav>
              </div>
            </div>

            {/* Sidebar Footer: Quick Sign Out */}
            <div className="p-4 border-t border-[#e5e7eb]">
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#dc2626] bg-[#fee2e2] hover:bg-[#fecaca] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </aside>

          {/* =========================================================
              MAIN PORTAL CONTENT AREA
              ========================================================= */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Navigation Bar */}
            <header className="h-16 px-8 bg-white border-b border-[#e5e7eb] flex items-center justify-between sticky top-0 z-20">
              
            </header>
            {/* Page Main Content */}
            <main className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
              {/* =========================================================
                  1. 4 ACTION / MODULE CARDS
                  ========================================================= */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Class Schedule */}
                <div
                  onClick={() => setActiveTab('Routine')}
                  className={`rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer group min-h-[190px] ${
                    activeTab === 'Routine' ? 'bg-[#d0e4d8] ring-2 ring-[#002626]' : 'bg-[#e5ece8]'
                  }`}
                >
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
                  <span className="font-semibold text-sm text-[#191c1d]">Canvas</span>
                </div>

                {/* Card 3: Notes and Material */}
                <Link
                  href="/notes"
                  className="bg-[#e5ece8] rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer group min-h-[190px]"
                >
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <span className="font-semibold text-sm text-[#191c1d]">Notes and Material</span>
                </Link>

                {/* Card 4: Group Chats */}
                <div className="bg-[#e5ece8] rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 hover:shadow-md transition-all cursor-pointer group min-h-[190px]">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-[#191c1d]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-sm text-[#191c1d]">Group Chats</span>
                </div>
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
                  3. ROUTINE ORCHESTRATOR & TIMETABLE DISPLAY
                  ========================================================= */}
              {activeTab === 'Routine' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[#191c1d] tracking-tight">Academic Routine & Class Schedule</h2>
                      <p className="text-xs text-[#707978]">Weekly timetable synchronized from university intake</p>
                    </div>
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[#002626] bg-[#e2ede6] hover:bg-[#d0e4d8] transition-colors"
                    >
                      <span>📊</span>
                      <span>Sync Spreadsheet Routine</span>
                    </Link>
                  </div>
                  <RoutineOrchestrator />
                </div>
              )}

              {/* =========================================================
                  4. STAFFING & ALLOCATION LEDGER (DYNAMIC COMPONENT)
                  ========================================================= */}
              <StaffingLedger />
            </main>
          </div>
        </div>
      );
    }