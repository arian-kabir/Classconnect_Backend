// // frontend/app/page.tsx
// 'use client';

// import RoutineOrchestrator from '@/src/components/RoutineOrchestrator';

// export default function Home() {
//   return <RoutineOrchestrator />;
// }
// frontend/app/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  // const { data: session, status } = useSession();
  // const router = useRouter();

  // useEffect(() => {
  //   if (status === 'unauthenticated') {
  //     router.push('/auth/signin');
  //   }
  // }, [status, router]);

  // if (status === 'loading') {}
  //   return (
  //     <div className="flex items-center justify-center h-screen">
  //       <p>Loading...</p>
  //     </div>
  //   );
  // }

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
        Hello, Student!
        {/* Welcome, {session?.user?.name || 'Student'}! */}
      </h1>
      <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
        Manage your courses, notes, and communications all in one place.
      </p>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">📝 Notes</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Access and manage your course notes.
          </p>
          <Link href="/notes">
            <button className="mt-4 text-sm font-medium text-[#003B46] hover:underline">
              Go to Notes →
            </button>
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">💬 Chat</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Communicate with classmates and teachers.
          </p>
          <Link href="/chat">
            <button className="mt-4 text-sm font-medium text-[#003B46] hover:underline">
              Go to Chat →
            </button>
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">📚 Courses</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            View your enrolled courses and materials.
          </p>
          <button className="mt-4 text-sm font-medium text-[#003B46] hover:underline">
            Coming Soon →
          </button>
        </div>
      </div>
    </div>
  );
}