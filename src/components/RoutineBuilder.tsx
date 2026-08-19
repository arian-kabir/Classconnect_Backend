"use client";

import { useState, useEffect, useCallback } from 'react';

interface Section {
  section_id: number;
  section_code: string;
  semester: string;
  year: number;
}

interface Course {
  course_id: number;
  course_code: string;
  course_name: string;
  sections: Section[];
}

interface RoutineBuilderProps {
  onRoutineAdded: () => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function RoutineBuilder({ onRoutineAdded }: RoutineBuilderProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  
  const [formData, setFormData] = useState({
    section_id: "",
    day_of_week: "Monday",
    start_time: "09:00",
    end_time: "10:30",
    room_number: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchCourses = useCallback(async () => {
    const controller = new AbortController();
    try {
      setIsLoadingCourses(true);
      const res = await fetch('/api/courses', { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch courses");
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setCourses(data);
      } else {
        console.error("Invalid courses payload format:", data);
        setCourses([]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Failed to load courses:", err);
      setError("Could not load available courses from the database.");
    } finally {
      setIsLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Safe find with null guarding
  const selectedCourse = courses.find(
    (c) => c?.course_id != null && c.course_id.toString() === selectedCourseId
  );
  const availableSections = selectedCourse && Array.isArray(selectedCourse.sections) ? selectedCourse.sections : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.section_id || !formData.day_of_week || !formData.start_time || !formData.end_time) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save routine entry");

      setSuccessMessage("Routine entry added successfully!");
      setFormData({
        section_id: "",
        day_of_week: "Monday",
        start_time: "09:00",
        end_time: "10:30",
        room_number: "",
      });
      setSelectedCourseId("");
      
      // Trigger parent component refresh
      onRoutineAdded();
    } catch (err: any) {
      console.error("Error submitting routine:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100" aria-label="Routine Builder Form">
      <div className="border-b border-gray-100 pb-5 mb-6">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Add Class to Routine</h3>
        <p className="text-sm text-gray-500 mt-1">Select a course, section, and schedule your weekly classes.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium" role="alert">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-medium" role="alert">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="course-select" className="block text-sm font-semibold text-gray-700 mb-2">
            Course <span className="text-red-500">*</span>
          </label>
          <select 
            id="course-select"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setFormData({ ...formData, section_id: "" });
            }}
            disabled={!isMounted || isLoadingCourses}
            required
          >
            <option value="" disabled>-- Select a Course --</option>
            {courses
              .filter((course) => course && course.course_id != null)
              .map((course) => (
                <option key={course.course_id} value={course.course_id.toString()}>
                  {course.course_code}: {course.course_name}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="section-select" className="block text-sm font-semibold text-gray-700 mb-2">
            Section <span className="text-red-500">*</span>
          </label>
          <select 
            id="section-select"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            value={formData.section_id}
            onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
            disabled={!isMounted || !selectedCourseId || availableSections.length === 0}
            required
          >
            <option value="" disabled>-- Select Section --</option>
            {availableSections.map((sec) => (
              <option key={sec.section_id} value={sec.section_id.toString()}>
                Section {sec.section_code} ({sec.semester} {sec.year})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="day-select" className="block text-sm font-semibold text-gray-700 mb-2">
            Day of the Week <span className="text-red-500">*</span>
          </label>
          <select 
            id="day-select"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium text-gray-800"
            value={formData.day_of_week}
            onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
            required
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start-time" className="block text-sm font-semibold text-gray-700 mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input 
              type="time" 
              id="start-time"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium text-gray-800"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
          </div>
          <div>
            <label htmlFor="end-time" className="block text-sm font-semibold text-gray-700 mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <input 
              type="time" 
              id="end-time"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium text-gray-800"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="room-number" className="block text-sm font-semibold text-gray-700 mb-2">
            Room Number
          </label>
          <input 
            type="text" 
            id="room-number"
            placeholder="e.g. Room 402 / Lab 3"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all font-medium text-gray-800 placeholder-gray-400"
            value={formData.room_number}
            onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={!isMounted || isSubmitting}
          className="w-full py-3.5 px-4 bg-black hover:bg-zinc-800 text-white font-semibold rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving Entry..." : "Add to Routine"}
        </button>
      </form>
    </section>
  );
}