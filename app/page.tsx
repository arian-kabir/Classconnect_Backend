// // frontend/app/page.tsx
// 'use client';

// import RoutineOrchestrator from '@/src/components/RoutineOrchestrator';

// export default function Home() {
//   return <RoutineOrchestrator />;
// }
// frontend/app/page.tsx
// 'use client';

// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import { useEffect } from 'react';
// import Link from 'next/link';

// export default function Home() {
//   // const { data: session, status } = useSession();
//   // const router = useRouter();

//   // useEffect(() => {
//   //   if (status === 'unauthenticated') {
//   //     router.push('/auth/signin');
//   //   }
//   // }, [status, router]);

//   // if (status === 'loading') {}
//   //   return (
//   //     <div className="flex items-center justify-center h-screen">
//   //       <p>Loading...</p>
//   //     </div>
//   //   );
//   // }

//   return (
//     <div className="max-w-7xl mx-auto px-8 py-12">
//       <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-6">
//         Hello, Student!
//         {/* Welcome, {session?.user?.name || 'Student'}! */}
//       </h1>
//       <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
//         Manage your courses, notes, and communications all in one place.
//       </p>

//       {/* Dashboard Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800">
//           <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">📝 Notes</h3>
//           <p className="text-sm text-slate-600 dark:text-slate-300">
//             Access and manage your course notes.
//           </p>
//           <Link href="/notes">
//             <button className="mt-4 text-sm font-medium text-[#003B46] hover:underline">
//               Go to Notes →
//             </button>
//           </Link>
//         </div>

//         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800">
//           <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">💬 Chat</h3>
//           <p className="text-sm text-slate-600 dark:text-slate-300">
//             Communicate with classmates and teachers.
//           </p>
//           <Link href="/chat">
//             <button className="mt-4 text-sm font-medium text-[#003B46] hover:underline">
//               Go to Chat →
//             </button>
//           </Link>
//         </div>

//         <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-zinc-800">
//           <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">📚 Courses</h3>
//           <p className="text-sm text-slate-600 dark:text-slate-300">
//             View your enrolled courses and materials.
//           </p>
//           <button className="mt-4 text-sm font-medium text-[#003B46] hover:underline">
//             Coming Soon →
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
// frontend/app/page.tsx

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  /*
   * ============================================================
   * AUTHENTICATION
   * ============================================================
   *
   * These lines can be uncommented if the homepage should only
   * be accessible to authenticated users.
   *
   * At the moment they are intentionally left commented so the
   * page behaves exactly like your current implementation.
   *
   * If you want the homepage to be protected, uncomment this
   * section and the loading section below.
   */

  // const { data: session, status } = useSession();
  // const router = useRouter();

  // useEffect(() => {
  //   if (status === 'unauthenticated') {
  //     router.push('/auth/signin');
  //   }
  // }, [status, router]);

  // if (status === 'loading') {
  //   return (
  //     <div className="home-loading">
  //       <div className="home-loading-spinner"></div>
  //       <p>Loading your dashboard...</p>
  //     </div>
  //   );
  // }

  return (
    <main className="home-page">

      {/* ========================================================
          HERO / WELCOME SECTION
          ======================================================== */}

      <section className="home-hero">

        {/* Left side of the welcome section */}
        <div className="home-hero-content">

          {/* Small label above the main heading */}
          <span className="home-eyebrow">
            Student Dashboard
          </span>

          {/* Main welcome heading */}
          <h1 className="home-title">
            Hello, Student<span className="home-title-dot">.</span>
          </h1>

          {/* 
           * If authentication is enabled, this can later be changed
           * to:
           *
           * Welcome back, {session?.user?.name || 'Student'}.
           */}

          <p className="home-description">
            Everything you need for your academic work,
            organized in one place.
          </p>

          {/* Quick action buttons */}
          <div className="home-hero-actions">

            <Link
              href="/notes"
              className="home-primary-action"
            >
              <span className="home-action-icon">✎</span>
              Open Notes
            </Link>

            <Link
              href="/chat"
              className="home-secondary-action"
            >
              Open Chat
              <span className="home-arrow">→</span>
            </Link>

          </div>
        </div>


        {/* ======================================================
            DECORATIVE DASHBOARD PREVIEW
            ======================================================

            This is purely visual.

            It does not affect any existing functionality and can
            later be replaced with statistics, recent notes,
            announcements, etc.
        */}

        <div className="home-hero-visual">

          {/* Decorative background shapes */}
          <div className="hero-decoration hero-decoration-one"></div>
          <div className="hero-decoration hero-decoration-two"></div>

          {/* Fake dashboard preview */}
          <div className="hero-preview">

            {/* Preview header */}
            <div className="hero-preview-header">

              <div className="hero-preview-brand">
                <span className="hero-preview-logo">C</span>

                <div>
                  <strong>ClassConnect</strong>
                  <span>Academic Portal</span>
                </div>
              </div>

              <span className="hero-preview-status">
                ● Active
              </span>

            </div>

            {/* Preview content */}
            <div className="hero-preview-content">

              <div className="hero-preview-heading">
                <span>Your workspace</span>
                <strong>Ready to study</strong>
              </div>

              {/* Mini cards */}
              <div className="hero-preview-cards">

                <div className="hero-mini-card">
                  <span className="hero-mini-icon notes-icon">✎</span>

                  <div>
                    <strong>Notes</strong>
                    <span>Organize your work</span>
                  </div>
                </div>

                <div className="hero-mini-card">
                  <span className="hero-mini-icon chat-icon">•••</span>

                  <div>
                    <strong>Chat</strong>
                    <span>Stay connected</span>
                  </div>
                </div>

              </div>

              {/* Decorative progress line */}
              <div className="hero-progress">
                <span></span>
              </div>

            </div>
          </div>
        </div>
      </section>


      {/* ========================================================
          DASHBOARD SECTION
          ======================================================== */}

      <section className="home-dashboard">

        {/* Section heading */}
        <div className="home-section-header">

          <div>
            <span className="home-section-eyebrow">
              Workspace
            </span>

            <h2>
              Your academic tools
            </h2>
          </div>

          <p>
            Access your notes, conversations, and courses.
          </p>

        </div>


        {/* ======================================================
            APPLICATION CARDS
            ====================================================== */}

        <div className="home-card-grid">

          {/* ====================================================
              NOTES CARD
              ==================================================== */}

          <Link
            href="/notes"
            className="home-feature-card home-feature-card-primary"
          >

            {/* Card top row */}
            <div className="home-card-top">

              <div className="home-feature-icon">
                ✎
              </div>

              <span className="home-card-arrow">
                ↗
              </span>

            </div>

            {/* Card text */}
            <div className="home-card-body">

              <span className="home-card-label">
                Workspace
              </span>

              <h3>
                Notes
              </h3>

              <p>
                Create, organize, and edit your course notes
                in your personal workspace.
              </p>

            </div>

            {/* Card footer */}
            <div className="home-card-footer">
              <span>Open workspace</span>
              <span>→</span>
            </div>

          </Link>


          {/* ====================================================
              CHAT CARD
              ==================================================== */}

          <Link
            href="/chat"
            className="home-feature-card"
          >

            {/* Card top row */}
            <div className="home-card-top">

              <div className="home-feature-icon home-feature-icon-chat">
                •••
              </div>

              <span className="home-card-arrow">
                ↗
              </span>

            </div>

            {/* Card text */}
            <div className="home-card-body">

              <span className="home-card-label">
                Communication
              </span>

              <h3>
                Chat
              </h3>

              <p>
                Communicate with classmates and teachers
                from one central space.
              </p>

            </div>

            {/* Card footer */}
            <div className="home-card-footer">
              <span>Open conversations</span>
              <span>→</span>
            </div>

          </Link>


          {/* ====================================================
              COURSES CARD
              ====================================================

              This is intentionally NOT a button because there is
              currently no course route or functionality.
          */}

          <div className="home-feature-card home-feature-card-disabled">

            {/* Card top row */}
            <div className="home-card-top">

              <div className="home-feature-icon home-feature-icon-course">
                ▦
              </div>

              <span className="home-coming-soon">
                Soon
              </span>

            </div>

            {/* Card text */}
            <div className="home-card-body">

              <span className="home-card-label">
                Learning
              </span>

              <h3>
                Courses
              </h3>

              <p>
                View enrolled courses, materials, schedules,
                and academic resources.
              </p>

            </div>

            {/* Disabled card footer */}
            <div className="home-card-footer">
              <span>Coming soon</span>
              <span>—</span>
            </div>

          </div>

        </div>
      </section>


      {/* ========================================================
          BOTTOM INFORMATION STRIP
          ======================================================== */}

      <section className="home-info-strip">

        <div className="home-info-icon">
          ✓
        </div>

        <div>
          <strong>
            Everything in one place
          </strong>

          <p>
            Your notes and communication tools are always
            available from the navigation bar.
          </p>
        </div>

      </section>

    </main>
  );
}