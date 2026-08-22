"use client";

import RoutineBuilder from './RoutineBuilder';
import RoutineDisplay from './RoutineDisplay';

export default function RoutineOrchestrator() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: The Builder Form */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
        <RoutineBuilder />
      </div>

      {/* Right Column: The Routine Display */}
      <div className="lg:col-span-7 xl:col-span-8">
        <RoutineDisplay />
      </div>
    </div>
  );
}