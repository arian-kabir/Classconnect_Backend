'use client';

/**
 * app/admin/allocations/page.tsx — Dedicated Section Staffing & Allocation Ledger Route
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-Role Section Staffing & Allocation Ledger
 * (Module 2 — Faria Fairooz Zahan)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StaffingLedger from '@/components/StaffingLedger';

export default function AllocationsAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
          <p className="text-sm font-medium text-[#404848]">Loading Staffing Ledger...</p>
        </div>
      </div>
    );
  }

  const user = session?.user as any;

  return (
    <div className="min-h-screen flex bg-[#f8f9fa] text-[#191c1d] font-sans selection:bg-[#002626] selection:text-white">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-[#f3f4f5] border-r border-[#e5e7eb] flex flex-col flex-shrink-0 min-h-screen">
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#e5e7eb]">
          <span className="text-xl">🎓</span>
          <span className="font-bold text-base text-[#191c1d] tracking-tight">ClassConnect Admin</span>
        </div>

        <div className="flex-1 py-6 flex flex-col gap-6">
          <div>
            <h3 className="px-6 text-[11px] font-bold uppercase tracking-wider text-[#707978] mb-3">
              Admin Consoles
            </h3>
            <nav className="flex flex-col gap-1 px-3">
              <Link
                href="/admin/allocations"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#002626] bg-[#e2ede6] transition-all"
              >
                <span className="text-base">📋</span>
                <span>Staffing Ledger</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#404848] hover:text-[#002626] hover:bg-[#e7e9ea] transition-all"
              >
                <span className="text-base">📊</span>
                <span>Routine Intake</span>
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#404848] hover:text-[#002626] hover:bg-[#e7e9ea] transition-all mt-2"
              >
                <span className="text-base">←</span>
                <span>Academic Portal</span>
              </Link>
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-[#e5e7eb]">
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#dc2626] bg-[#fee2e2] hover:bg-[#fecaca] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-8 bg-white border-b border-[#e5e7eb] flex items-center justify-between sticky top-0 z-20">
          <div>
            <h1 className="font-bold text-base md:text-lg text-[#191c1d] tracking-tight">
              Cross-Role Section Staffing & Allocation Ledger
            </h1>
            <p className="text-xs text-[#707978]">Configure professors, student tutors, and student segment enrollments</p>
          </div>

          <Link
            href="/dashboard"
            className="text-xs font-bold text-[#002626] bg-[#e2ede6] hover:bg-[#d0e4d8] px-3.5 py-2 rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </header>

        <main className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
          <StaffingLedger />
        </main>
      </div>
    </div>
  );
}
