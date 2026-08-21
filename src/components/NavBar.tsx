// // frontend/src/components/Navbar.tsx
// // 'use client';

// // import Link from 'next/link';
// // import { usePathname, useRouter } from 'next/navigation';
// // import { signOut } from 'next-auth/react';

// // export default function Navbar() {
// //   const pathname = usePathname();
// //   const router = useRouter();

// //   const handleSignOut = async () => {
// //     await signOut({ callbackUrl: '/auth/signin' });
// //   };

// //   // Don't show navbar on signin page
//   // if (pathname === '/auth/signin') {
//   //   return null;
//   // }

// //   return (
// //     <header className="border-b border-slate-200 bg-white px-8 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
// //       <div className="mx-auto flex max-w-7xl items-center justify-between">
// //         {/* Left: Logo */}
// //         <div className="flex items-center gap-3">
// //           <button className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded bg-[#EBF1F5] dark:bg-zinc-800">
// //             <span className="h-0.5 w-5 bg-slate-600 dark:bg-white"></span>
// //             <span className="h-0.5 w-5 bg-slate-600 dark:bg-white"></span>
// //             <span className="h-0.5 w-5 bg-slate-600 dark:bg-white"></span>
// //           </button>
// //           <Link href="/" className="flex flex-col cursor-pointer">
// //             <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-manrope">
// //               ClassConnect
// //             </span>
// //             <span className="text-[10px] uppercase tracking-wider text-slate-400 font-hanken">
// //               Academic Portal
// //             </span>
// //           </Link>
// //         </div>

// //         {/* Right: Navigation Buttons */}
// //         <div className="flex items-center gap-3 font-hanken">
// //           <Link href="/">
// //             <button className="rounded bg-[#003B46] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00272e]">
// //               Home
// //             </button>
// //           </Link>

// //           <Link href="/notes">
// //             <button className="rounded bg-[#E0E8F5] px-5 py-2 text-sm font-semibold text-[#003B46] transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-white">
// //               Notes
// //             </button>
// //           </Link>

// //           <Link href="/chat">
// //             <button className="rounded bg-[#E0E8F5] px-5 py-2 text-sm font-semibold text-[#003B46] transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-white">
// //               Chat
// //             </button>
// //           </Link>

// //           <button
// //             onClick={handleSignOut}
// //             className="rounded bg-[#E0E8F5] px-5 py-2 text-sm font-semibold text-[#003B46] transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-white"
// //           >
// //             Logout
// //           </button>
// //         </div>
// //       </div>
// //     </header>
// //   );
// // }
// // frontend/src/components/Navbar.tsx

// 'use client';

// import Link from 'next/link';
// import { usePathname } from 'next/navigation';
// import { signOut } from 'next-auth/react';
// import { SignOutButton } from './auth/SignOutButton';

// export default function Navbar() {

//   /*
//    * ============================================================
//    * CURRENT ROUTE
//    * ============================================================
//    *
//    * usePathname lets us determine which navigation item should
//    * appear active.
//    *
//    * Example:
//    *
//    * /       -> Home is active
//    * /notes  -> Notes is active
//    * /chat   -> Chat is active
//    */

//   const pathname = usePathname();


//   /*
//    * ============================================================
//    * SIGN OUT
//    * ============================================================
//    *
//    * NextAuth handles the actual session termination.
//    *
//    * After signing out, the user is redirected to the signin page.
//    */

//   const handleSignOut = async () => {
//     await signOut({
//       callbackUrl: '/auth/signout',
//     });
//   };


//   /*
//    * ============================================================
//    * AUTH PAGE
//    * ============================================================
//    *
//    * The navbar should not appear on the signin page.
//    *
//    * You can add additional auth routes here later if needed.
//    *
//    * Example:
//    *
//    * if (
//    *   pathname === '/auth/signin' ||
//    *   pathname === '/auth/signup'
//    * ) {
//    *   return null;
//    * }
//    */

//   if (pathname === '/auth/signin') {
//     return null;
//   }
//   if (pathname === '/auth/signup') {
//     return null;
//   }

//   /*
//    * ============================================================
//    * NAVBAR
//    * ============================================================
//    */

//   return (
//     <header className="app-navbar">

//       <div className="navbar-inner">

//         <Link
//           href="/"
//           className="navbar-brand"
//           aria-label="ClassConnect home"
//         >

//           {/* Logo mark */}
//           <span className="navbar-logo">
//              <img src="../../public/Classconnect_logo.png" alt="Logo" />
//           </span>

//           {/* Brand text */}
//           <span className="navbar-brand-text">

//             <span className="navbar-title">
//               ClassConnect
//             </span>

//             <span className="navbar-subtitle">
//               Academic Portal
//             </span>

//           </span>

//         </Link>


//         {/* ======================================================
//             DESKTOP NAVIGATION
//             ====================================================== */}

//         <nav
//           className="navbar-navigation"
//           aria-label="Main navigation"
//         >

//           {/* Notes */}
//           <Link
//             href="/notes"
//             className={`navbar-link ${
//               pathname.startsWith('/notes')
//                 ? 'navbar-link-active'
//                 : ''
//             }`}
//           >
//             <span className="navbar-link-icon">✎</span>
//             <span>Notes</span>
//           </Link>


//           {/* Chat */}
//           <Link
//             href="/chat"
//             className={`navbar-link ${
//               pathname.startsWith('/chat')
//                 ? 'navbar-link-active'
//                 : ''
//             }`}
//           >
//             <span className="navbar-link-icon">•••</span>
//             <span>Chat</span>
//           </Link>

//         </nav>


//         {/* ======================================================
//             RIGHT SIDE ACTIONS
//             ====================================================== */}

//         <div className="navbar-actions">

//           {/* 
//            * Future notification button.
//            *
//            * Keeping this commented means you can add
//            * notifications later without redesigning the navbar.
//            *
//            * <button className="navbar-icon-button">
//            *   ♢
//            * </button>
//            */}

//           {/* User status */}
//           <div className="navbar-user">

//             <span className="navbar-user-avatar">
//               S
//             </span>

//             <div className="navbar-user-info">

//               <span className="navbar-user-name">
//                 Student
//               </span>

//               <span className="navbar-user-status">
//                 <span className="navbar-status-dot"></span>
//                 Online
//               </span>

//             </div>

//           </div>


//           {/* Logout button */}
//           <button
//             type="button"
//             onClick={handleSignOut}
//             className="navbar-logout"
//           >
//             <span className="navbar-logout-icon">
//               ↪
//             </span>

//             <span>
//               Logout
//             </span>
//           </button>
//           <SignOutButton />
//         </div>

//       </div>

//     </header>
//   );
// }
// frontend/src/components/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  // Don't show navbar on signin page
  if (pathname === '/auth/signin' || pathname === '/auth/login') {
    return null;
  }

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <div className="w-8 h-8 rounded-full bg-[#002626] text-white flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a2 2 0 100 4 2 2 0 000-4zm-1.5 6h3a1 1 0 011 1v5h-2v6h-2v-6h-2V9a1 1 0 011-1z" />
                </svg>
              </div>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab('Routine')}
                className={`relative py-5 text-sm font-semibold transition-colors ${
                  activeTab === 'Routine' ? 'text-[#191c1d]' : 'text-[#707978] hover:text-[#191c1d]'
                }`}
              >
                Routine
                {activeTab === 'Routine' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#002626]" />
                )}
              </button>

              <Link
                href="/notes"
                onClick={() => setActiveTab('Notes')}
                className={`relative py-5 text-sm font-semibold transition-colors ${
                  activeTab === 'Notes' ? 'text-[#191c1d]' : 'text-[#707978] hover:text-[#191c1d]'
                }`}
              >
                Notes
              </Link>

              <Link
                href="/chat"
                onClick={() => setActiveTab('Chat')}
                className={`relative py-5 text-sm font-semibold transition-colors ${
                  activeTab === 'Chat' ? 'text-[#191c1d]' : 'text-[#707978] hover:text-[#191c1d]'
                }`}
              >
                Chat
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className="text-sm font-semibold text-[#dc2626] hover:text-[#93000a] transition-colors ml-2"
              >
                Logout
              </button>
              </nav>  
    </header>
  );
}