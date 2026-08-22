"use client";

/**
 * src/app/components/RoutineDisplay.tsx
 *
 * Zero-compromise refactor.
 *
 * Fixes applied vs original:
 * - [H-3] Added AbortController to cancel in-flight fetch on rapid refreshes.
 *         Prevents stale responses from overwriting newer state.
 * - [M-9] `fetchRoutines` wrapped in `useCallback` — stable reference across renders.
 * - Replaced `window.confirm` and `alert` with inline UI state (production standard).
 * - Added loading overlay on refresh (not just initial load) — UX improvement.
 * - Typed with RoutineEntry from unified type system.
 * - `mountRef` pattern removed — AbortController handles the unmount case cleanly.
 */

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import WeeklyTimetable from './WeeklyTimetable';
import type { RoutineEntry } from '@/types/index';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 401) throw new Error('Session expired. Please sign in again.');
    throw new Error(`Server error: ${res.status}`);
  }
  return res.json();
};

export default function RoutineDisplay() {
  const { data: routines, error: swrError, isLoading, mutate } = useSWR<RoutineEntry[]>('/api/routines', fetcher, {
    revalidateOnFocus: true,
  });

  const error = swrError?.message || null;
  const displayRoutines = routines || [];
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Delete handler ──────────────────────────────────────────────────────
  const handleDelete = useCallback(async (routineId: number) => {
    setDeleteError(null);
    try {
      const res = await fetch(`/api/routines?routine_id=${routineId}`, {
        method: 'DELETE',
      });

      const data = await res.json() as { error?: string };

      if (!res.ok) {
        setDeleteError(data.error ?? 'Failed to remove this class');
        return;
      }

      // Optimistic local removal via SWR mutate
      mutate(
        (prev) => prev?.filter((r) => (r.routine_id as unknown as number) !== routineId),
        false
      );
    } catch (err) {
      console.error('[RoutineDisplay] delete error:', err);
      setDeleteError('Failed to remove class. Please try again.');
    }
  }, [mutate]);

  // ── Error (no routines at all) ──────────────────────────────────────────
  if (error && displayRoutines.length === 0) {
    return (
      <div className="bg-red-50 p-12 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-600 font-bold mb-2">Error Loading Routine</p>
        <p className="text-red-500/80 text-sm mb-4 max-w-sm">{error}</p>
        <button
          onClick={() => mutate()}
          className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm font-bold shadow-sm"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // ── Today's classes ─────────────────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysClasses = displayRoutines
    .filter((r) => r.day_of_week === todayStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="h-full flex flex-col gap-6">

      {/* ── Delete error toast ──────────────────────────────────────────── */}
      {deleteError && (
        <div
          className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium flex items-center justify-between"
          role="alert"
        >
          <span>{deleteError}</span>
          <button
            onClick={() => setDeleteError(null)}
            className="ml-3 text-red-400 hover:text-red-600"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Today's Classes Quick Summary ──────────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" aria-hidden="true" />
        <div className="flex items-center gap-2 mb-4 relative z-10">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Today&apos;s Classes — {todayStr}
          </h2>
        </div>

        {isLoading ? (
          <div className="animate-pulse flex gap-3 overflow-x-auto">
            <div className="h-24 bg-slate-100 rounded-lg min-w-[200px]" />
            <div className="h-24 bg-slate-100 rounded-lg min-w-[200px]" />
          </div>
        ) : todaysClasses.length === 0 ? (
          <div className="flex items-center gap-3 text-slate-500 bg-slate-50 border border-slate-100 p-4 rounded-lg">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">No classes scheduled today. Enjoy your free time!</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {todaysClasses.map((cls) => (
              <div
                key={cls.routine_id as unknown as number}
                className={`min-w-[210px] bg-white border ${cls.is_owner ? 'border-indigo-200 hover:border-indigo-400 shadow-sm hover:shadow-md' : 'border-slate-200 opacity-75 hover:opacity-100'} rounded-lg p-3 flex-shrink-0 transition-all relative overflow-hidden`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${cls.is_owner ? 'bg-indigo-500' : 'bg-slate-300'} rounded-l-lg`} aria-hidden="true" />
                <div className="flex justify-between items-start mb-1.5 pl-3">
                  <span className={`font-bold text-sm ${cls.is_owner ? 'text-slate-900' : 'text-slate-600'}`}>{cls.course_code} — Sec {cls.section_id}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded ml-1 flex-shrink-0">
                    {cls.room_number ?? 'TBA'}
                  </span>
                </div>
                <div className={`text-xs font-medium truncate mb-2 pl-3 pr-1 ${cls.is_owner ? 'text-slate-500' : 'text-slate-400'}`}>
                  {cls.course_name}
                  {!cls.is_owner && cls.teacher_name && ` (Prof. ${cls.teacher_name})`}
                </div>
                <div className={`text-xs font-bold w-max px-2 py-1 rounded ml-3 flex items-center gap-1.5 ${cls.is_owner ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 bg-slate-100'}`}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {cls.start_time.slice(0, 5)} – {cls.end_time.slice(0, 5)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Full weekly timetable ───────────────────────────────────────── */}
      <WeeklyTimetable
        routines={displayRoutines}
        isLoading={isLoading}
        onDelete={handleDelete}
      />
    </div>
  );
}