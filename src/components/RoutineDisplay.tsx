"use client";

import { useState, useEffect, useRef } from 'react';

interface Routine {
  routine_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string;
  course_code: string;
  course_name: string;
  section_code: string;
}

export default function RoutineDisplay({ refreshTrigger }: { refreshTrigger: number }) {
  const [routines, setRoutines] = useState<Routine[]>([]);
  
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const mountRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    
    if (mountRef.current) {
      setIsBackgroundRefreshing(true);
    }
    
    setError(false);

    // Dynamic cache-busting timestamp combined with strict type-guarding
    fetch(`/api/routines?_t=${Date.now()}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error("Network response failed");
        return res.json();
      })
      .then((data: any) => {
        // MICROSCOPIC FIX: Guarantee payload is an array to prevent runtime .map crashes
        if (Array.isArray(data)) {
          setRoutines(data);
        } else {
          console.error("API payload validation failed: Expected array", data);
          setRoutines([]);
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error("Failed to load routines:", err);
        setError(true);
      })
      .finally(() => {
        setIsInitialLoad(false);
        setIsBackgroundRefreshing(false);
        mountRef.current = true;
      });

    return () => controller.abort();
  }, [refreshTrigger]);

  const formatTime = (timeString: string) => {
    if (!timeString) return "TBA";
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return timeString.slice(0, 5); 
    }
  };

  if (error && routines.length === 0) {
    return (
      <div className="bg-red-50 p-12 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <p className="text-red-600 font-medium">Failed to load routine data.</p>
        <p className="text-sm text-red-500 mt-1">Check your local MySQL database connection.</p>
      </div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center h-full min-h-[300px]" aria-busy="true" aria-label="Loading routines">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 bg-gray-200 rounded-md w-32 mb-4"></div>
          <div className="h-3 bg-gray-100 rounded-md w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full relative" aria-label="Your Class Routine">
      
      {isBackgroundRefreshing && (
        <div className="absolute top-6 right-6">
           <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        </div>
      )}

      <div className="p-6 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Your Current Routine</h3>
      </div>
      
      {routines.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
          <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <h3 className="text-lg font-medium text-gray-900">No classes scheduled</h3>
          <p className="text-gray-500 mt-1">Use the builder to add sections to your routine.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto" role="list">
          {routines.map((routine) => (
            <article key={routine.routine_id} role="listitem" className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors focus-within:ring-2 focus-within:ring-black outline-none rounded-lg m-1">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="bg-black text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                    {routine.course_code}
                  </span>
                  <span className="text-sm font-semibold text-gray-600">
                    Section {routine.section_code}
                  </span>
                </div>
                <p className="text-gray-900 font-medium">{routine.course_name}</p>
              </div>
              <div className="mt-4 sm:mt-0 text-left sm:text-right flex-shrink-0">
                <p className="text-gray-900 font-semibold">{routine.day_of_week}</p>
                <p className="text-sm text-gray-500" aria-label={`Time: ${formatTime(routine.start_time)} to ${formatTime(routine.end_time)}`}>
                  <time dateTime={routine.start_time}>{formatTime(routine.start_time)}</time> - <time dateTime={routine.end_time}>{formatTime(routine.end_time)}</time>
                </p>
                <p className="text-xs text-gray-400 mt-1.5 font-medium flex items-center sm:justify-end gap-1.5" aria-label={`Room: ${routine.room_number}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Room {routine.room_number || 'TBA'}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}