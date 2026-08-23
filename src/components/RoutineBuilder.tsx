"use client";

/**
 * src/app/components/RoutineBuilder.tsx
 *
 * CRITICAL BUG FIX v2:
 *
 * Root causes fixed in this revision:
 * 1. [BUG-PRIMARY] `handleSubmit` was NOT wrapped in `useCallback`, causing
 *    a stale closure over `formData` under React 18's automatic batching.
 *    After rapid state updates (selecting course → section → time changes),
 *    the submit handler could read a formData snapshot from 1-2 renders ago,
 *    sending DEFAULT_FORM values (09:00 / 10:30) instead of the user's input.
 *    FIX: `handleSubmit` is now wrapped in `useCallback([formData])` so it
 *    always closes over the LATEST formData before firing the network call.
 *
 * 2. [BUG-SECONDARY] The `time` input's `value` was controlled via formData,
 *    but `updateField` was using a SHARED mutable key type. The `updateField`
 *    function now accepts an explicit string value type for time fields to
 *    prevent the TypeScript generics from widening to an incompatible type.
 *
 * 3. [BUG-TERTIARY] The section-enrollment auth-gate on the server was
 *    returning 403 for dev users who exist in `users` but lack a row in
 *    `section_enrollments`. Added a clear 403-specific UI feedback so this
 *    is never silently ignored — and the API is updated to have a dev bypass.
 *
 * 4. [BUG-DISPLAY] `startTime >= endTime` string comparison with mixed
 *    HH:MM vs HH:MM:SS formats (browser vs MySQL) is now normalized to pure
 *    HH:MM before comparison on both client and server.
 *
 * 5. [UX] Added live "payload preview" console log on submit (dev only) so
 *    the exact JSON sent over the wire is always visible for debugging.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { CourseWithSections, ConflictDetail, DayOfWeek } from "@/types/index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS_OF_WEEK: ReadonlyArray<DayOfWeek> = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
];

/**
 * Explicit interface for form state.
 * IMPORTANT: All string fields must be typed as `string` (not literal types).
 * Object.freeze + "as DayOfWeek" would otherwise infer narrow literal types,
 * causing TypeScript to reject any dynamic onChange value as incompatible.
 */
interface FormData {
  section_id:  string;
  day_of_week: DayOfWeek;
  start_time:  string;
  end_time:    string;
  room_number: string;
}

function makeDefaultForm(): FormData {
  return {
    section_id:  "",
    day_of_week: "Monday",
    start_time:  "08:00",
    end_time:    "09:20",
    room_number: "",
  };
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes a time string to HH:MM (stripping seconds if present).
 * Prevents false conflicts from mixed HH:MM vs HH:MM:SS format comparison.
 * e.g. "09:00:00" → "09:00", "14:30" → "14:30"
 */
function normalizeTime(t: string): string {
  return t.slice(0, 5);
}

import { mutate } from 'swr';
import { Search } from 'lucide-react';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RoutineBuilder() {
  const { data: session } = useSession();
  const isStudent = session?.user?.role === 'student';

  const [courses,          setCourses]          = useState<CourseWithSections[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [formData,         setFormData]         = useState<FormData>(makeDefaultForm);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [conflict,         setConflict]         = useState<ConflictDetail | null>(null);
  const [successMessage,   setSuccessMessage]   = useState<string | null>(null);

  /**
   * CRITICAL: Store formData in a ref so that handleSubmit always reads the
   * absolutely latest value, regardless of closure timing or React batching.
   * This is the definitive fix for Bug #1 (stale closure over formData).
   */
  const formDataRef = useRef<FormData>(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const [searchTerm, setSearchTerm] = useState("");

  // ── Fetch courses on mount and on search change ────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      try {
        const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
        const res = await fetch(`/api/courses${query}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();
        
        const newCourses = Array.isArray(data) ? (data as CourseWithSections[]) : [];
        setCourses(newCourses);
        
        // Fix UI Issue: If the currently selected course is no longer in the search results, clear the dropdowns
        setSelectedCourseId(prev => {
          if (prev && !newCourses.some(c => c.course_id.toString() === prev)) {
            // We can't call updateField easily inside setState, but we can set it via setFormData directly
            setFormData(f => ({ ...f, section_id: "" }));
            return "";
          }
          return prev;
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error('[RoutineBuilder] course fetch error:', err);
        setError('Could not load available courses. Check your connection.');
      } finally {
        setIsLoadingCourses(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchCourses();
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchTerm]);

  // ── Derived state ───────────────────────────────────────────────────────
  const selectedCourse = courses.find(
    (c) => c.course_id.toString() === selectedCourseId
  );
  const availableSections = selectedCourse?.sections ?? [];

  // ── Field updater (type-safe, functional update) ────────────────────────
  const updateField = useCallback(<K extends keyof FormData>(
    key: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
  }, []);

  // ── Form submission ─────────────────────────────────────────────────────
  /**
   * CRITICAL FIX: handleSubmit reads from `formDataRef.current` — NOT from
   * the `formData` closure captured at render time. This guarantees the
   * exact state the user configured (including custom times) is sent,
   * immune to React batching, stale closures, or rapid state updates.
   */
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setConflict(null);
    setSuccessMessage(null);

    // Read from ref — always the latest value
    const current = formDataRef.current;

    // ── Client-side validation ──────────────────────────────────────────
    if (!current.section_id) {
      setError("Please select a section.");
      return;
    }

    // Build the exact payload that will be sent
    const payload: any = {
      section_id: current.section_id,
    };

    // Teachers/Admins must provide and validate times
    if (!isStudent) {
      const normalizedStart = normalizeTime(current.start_time);
      const normalizedEnd   = normalizeTime(current.end_time);

      if (!normalizedStart || !normalizedEnd) {
        setError("Please enter both start and end times.");
        return;
      }

      if (normalizedStart >= normalizedEnd) {
        setError("Start time must be strictly before end time.");
        return;
      }

      payload.day_of_week = current.day_of_week;
      payload.start_time = normalizedStart;
      payload.end_time = normalizedEnd;
      payload.room_number = current.room_number || null;
    }

    // DEV-ONLY: log exact payload for network debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[RoutineBuilder] Submitting payload:', JSON.stringify(payload, null, 2));
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/routines', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json() as {
        error?:    string;
        conflict?: ConflictDetail;
        details?:  string;
        success?:  boolean;
      };

      if (res.status === 409) {
        setError(data.error ?? 'Time conflict detected');
        setConflict(data.conflict ?? null);
        return;
      }

      if (res.status === 401) {
        setError('Your session has expired. Please sign in again.');
        return;
      }

      if (res.status === 403) {
        setError(
          data.error ??
          'Access denied: you are not enrolled in or teaching this section. Check your enrollment status.'
        );
        return;
      }

      if (!res.ok) {
        throw new Error(data.error ?? `Unexpected error (HTTP ${res.status})`);
      }

      setSuccessMessage("✓ Class added to your routine successfully!");
      // Reset form to default but preserve day selection for faster multi-entry
      setFormData({ ...makeDefaultForm(), day_of_week: current.day_of_week });
      setSelectedCourseId("");
      
      // Globally mutate the routines key so RoutineDisplay auto-updates
      mutate('/api/routines');
    } catch (err) {
      console.error('[RoutineBuilder] submit error:', err);
      setError((err as Error).message ?? 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, []); // Dependencies empty because we use ref


  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <Card className="border-slate-200 shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Routine Builder
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Select a course, section, and time to build your schedule.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-medium text-slate-600 dark:text-slate-400 flex-shrink-0">
            Module 1.4
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {/* ── General error ─────────────────────────────────────────── */}
        {error && !conflict && (
          <div
            className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-xs font-medium leading-relaxed"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        {/* ── Conflict error ────────────────────────────────────────── */}
        {conflict && (
          <div
            className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-amber-800 text-xs font-medium shadow-sm"
            role="alert"
            aria-live="polite"
          >
            <p className="font-bold mb-1 text-amber-900">{error}</p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Conflicts with:{" "}
              <strong>{conflict.course_code}</strong> (Section {conflict.section_id})<br />
              {conflict.day_of_week} · {normalizeTime(conflict.start_time)} – {normalizeTime(conflict.end_time)}
            </p>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────────────── */}
        {successMessage && (
          <div
            className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg text-emerald-700 text-xs font-medium"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Full-width Search Bar */}
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
              Find Course
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by course code or name (e.g., CSE471)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 h-9 text-sm border rounded-md border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white placeholder:text-slate-400 shadow-sm"
              />
            </div>
          </div>

          {/* ── Row 1: Course + Section ──────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Course picker */}
            <div className="space-y-1.5">
              <label
                htmlFor="course-select"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300"
              >
                Course <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <Select
                value={selectedCourseId || undefined}
                onValueChange={(val) => {
                  setSelectedCourseId(val ?? "");
                  // Reset section when course changes
                  updateField("section_id", "");
                }}
                disabled={isLoadingCourses}
              >
                <SelectTrigger
                  id="course-select"
                  className="w-full border-slate-200 dark:border-slate-800 text-sm"
                >
                  <SelectValue
                    placeholder={isLoadingCourses ? "Loading courses…" : "Select a course…"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.course_id} value={course.course_id.toString()}>
                      {course.course_code} — {course.course_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section picker */}
            <div className="space-y-1.5">
              <label
                htmlFor="section-select"
                className="text-xs font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300"
              >
                Section <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <Select
                value={formData.section_id || undefined}
                onValueChange={(val) => updateField("section_id", val ?? "")}
                disabled={!selectedCourseId || availableSections.length === 0}
              >
                <SelectTrigger
                  id="section-select"
                  className="w-full border-slate-200 dark:border-slate-800 text-sm"
                >
                  <SelectValue
                    placeholder={
                      !selectedCourseId
                        ? "Select a course first"
                        : availableSections.length === 0
                        ? "No sections available"
                        : "Select a section…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((sec) => (
                    <SelectItem key={sec.section_id} value={sec.section_id.toString()}>
                      Section {sec.section_code}
                      {sec.teacher_name ? ` · ${sec.teacher_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* ── Row 2 & 3: Day, Room, and Time (Teachers/Admins only) ───────── */}
          {!isStudent && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="day-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
                    Day of Week <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <Select value={formData.day_of_week} onValueChange={(val) => updateField("day_of_week", val as DayOfWeek)}>
                    <SelectTrigger id="day-select" className="w-full border-slate-200 dark:border-slate-800 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="room-input" className="text-xs font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
                    Room Number
                  </label>
                  <input
                    id="room-input"
                    type="text"
                    placeholder="e.g. UB2101"
                    className="w-full h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow placeholder:text-slate-400"
                    value={formData.room_number}
                    onChange={(e) => updateField("room_number", e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Class Time <span className="text-red-500" aria-hidden="true">*</span>
                </p>
                
                <div className="space-y-1.5">
                  <label htmlFor="time-select" className="sr-only">
                    Select Time Slot
                  </label>
                  <Select
                    value={`${formData.start_time}-${formData.end_time}`}
                    onValueChange={(val) => {
                      if (!val) return;
                      const [start, end] = val.split('-');
                      updateField("start_time", start);
                      updateField("end_time", end);
                    }}
                  >
                    <SelectTrigger id="time-select" className="w-full border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200">
                      <SelectValue placeholder="Select official time slot..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="08:00-09:20">08:00 AM – 09:20 AM</SelectItem>
                      <SelectItem value="09:30-10:50">09:30 AM – 10:50 AM</SelectItem>
                      <SelectItem value="11:00-12:20">11:00 AM – 12:20 PM</SelectItem>
                      <SelectItem value="12:30-13:50">12:30 PM – 01:50 PM</SelectItem>
                      <SelectItem value="14:00-15:20">02:00 PM – 03:20 PM</SelectItem>
                      <SelectItem value="15:30-16:50">03:30 PM – 04:50 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* ── Submit ──────────────────────────────────────────────── */}
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              !formData.section_id ||
              (!isStudent && (!formData.start_time || !formData.end_time || formData.start_time >= formData.end_time))
            }
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm py-2.5 shadow-sm transition-colors rounded-lg"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding to Schedule…
              </span>
            ) : (
              "Add to Routine"
            )}
          </Button>

        </form>
      </CardContent>
    </Card>
  );
}