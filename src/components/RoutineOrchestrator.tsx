// frontend/src/components/RoutineOrchestrator.tsx
'use client';

import { useState } from 'react';
import RoutineBuilder from './RoutineBuilder';
import RoutineDisplay from './RoutineDisplay';

export default function RoutineOrchestrator() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
        <RoutineBuilder onRoutineAdded={() => setRefreshTrigger(prev => prev + 1)} />
      </div>
      <div className="lg:col-span-7 xl:col-span-8">
        <RoutineDisplay refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}