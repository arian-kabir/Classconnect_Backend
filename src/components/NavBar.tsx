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
  if (pathname === '/auth/signin') {
    return null;
  }

  return (
    <header className="border-b border-slate-200 bg-white px-8 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <button className="flex h-10 w-10 flex-col items-center justify-center gap-1 rounded bg-[#EBF1F5] dark:bg-zinc-800">
            <span className="h-0.5 w-5 bg-slate-600 dark:bg-white"></span>
            <span className="h-0.5 w-5 bg-slate-600 dark:bg-white"></span>
            <span className="h-0.5 w-5 bg-slate-600 dark:bg-white"></span>
          </button>
          <Link href="/" className="flex flex-col cursor-pointer">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-manrope">
              ClassConnect
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-hanken">
              Academic Portal
            </span>
          </Link>
        </div>

        {/* Right: Navigation Buttons */}
        <div className="flex items-center gap-3 font-hanken">
          <Link href="/">
            <button className="rounded bg-[#003B46] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#00272e]">
              Home
            </button>
          </Link>

          <Link href="/notes">
            <button className="rounded bg-[#E0E8F5] px-5 py-2 text-sm font-semibold text-[#003B46] transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-white">
              Notes
            </button>
          </Link>

          <Link href="/chat">
            <button className="rounded bg-[#E0E8F5] px-5 py-2 text-sm font-semibold text-[#003B46] transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-white">
              Chat
            </button>
          </Link>

          <button
            onClick={handleSignOut}
            className="rounded bg-[#E0E8F5] px-5 py-2 text-sm font-semibold text-[#003B46] transition hover:bg-slate-200 dark:bg-zinc-800 dark:text-white"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}