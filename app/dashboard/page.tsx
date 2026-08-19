'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

const ROLE_LABELS: Record<string, string> = {
  student: 'University Student',
  teacher: 'Faculty Member',
  admin: 'System Administrator',
  student_tutor: 'Student Tutor',
};

const ROLE_COLORS: Record<string, string> = {
  student: '#b9eceb',
  teacher: '#d4e7dd',
  admin: '#ffdad6',
  student_tutor: '#dce4e1',
};

const FEATURES = [
  { icon: '📚', title: 'Course Materials', desc: 'Access and organize all your lecture notes, slides, and lab manuals.' },
  { icon: '💬', title: 'Section Chat Rooms', desc: 'Real-time messaging with classmates, lecturers, and tutors.' },
  { icon: '📅', title: 'Routine Builder', desc: 'Visualize your weekly class schedule and plan study sessions.' },
  { icon: '📝', title: 'Canvas Notes', desc: 'Freehand drawing and text notes powered by Excalidraw.' },
  { icon: '📋', title: 'Assignment Hub', desc: 'Submit, track, and review assignments all in one place.' },
  { icon: '📧', title: 'Email Templates', desc: 'Send leave applications and consultation requests in one click.' },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9fa' }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-[#002626] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#404848]" style={{ fontFamily: 'Hanken Grotesk, system-ui, sans-serif' }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as any;
  const role = user?.role || 'student';
  const roleLabel = ROLE_LABELS[role] || role;
  const roleBg = ROLE_COLORS[role] || '#e1e3e4';
  const font = { fontFamily: 'Hanken Grotesk, system-ui, sans-serif' };

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa', ...font }}>
      {/* Top Nav */}
      <header className="sticky top-0 z-10 w-full flex items-center justify-between px-6 h-16"
        style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e7e8e9' }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#002626]" />
            <div className="flex flex-col gap-1">
              <span className="w-2.5 h-1.5 rounded-full bg-[#002626]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#002626]" />
            </div>
          </div>
          <span className="text-lg font-bold tracking-tight text-[#002626]">ClassConnect</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            {user?.image
              ? <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full border border-[#c0c8c7]" />
              : <div className="w-8 h-8 rounded-full bg-[#002626] flex items-center justify-center text-white text-sm font-semibold">
                  {user?.name?.charAt(0) || '?'}
                </div>}
            <div>
              <p className="text-sm font-semibold text-[#191c1d] leading-none">{user?.name}</p>
              <p className="text-xs text-[#707978] mt-0.5">{user?.email}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-[#c0c8c7] text-[#191c1d] hover:bg-[#edeeef] transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome Banner */}
        <div className="rounded-xl p-8 mb-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #002626 0%, #003d3d 100%)', boxShadow: '0px 8px 24px rgba(0,38,38,0.25)' }}>
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10 bg-white" />
          <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full opacity-5 bg-white" />
          <div className="relative z-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: roleBg, color: '#002626' }}>
              {roleLabel}
            </span>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome, {user?.name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-[#76a8a7] text-sm max-w-xl">
              Your unified academic hub is being built. This dashboard is a placeholder — course materials, chat rooms, routines and more are coming soon.
            </p>
          </div>
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-xl p-6 mb-6" style={{ border: '1px solid #e7e8e9', boxShadow: '0px 4px 12px rgba(0,0,0,0.04)' }}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#404848] mb-4">Session Information</h2>
          <div className="space-y-0">
            {[
              { label: 'Full Name', value: user?.name },
              { label: 'Email', value: user?.email },
              { label: 'Role', value: roleLabel },
              { label: 'User ID', value: user?.id },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-4 py-2.5 border-b border-[#f3f4f5] last:border-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#707978] w-28 flex-shrink-0">{row.label}</span>
                <span className="text-sm text-[#191c1d] font-medium">{row.value || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(card => (
            <div key={card.title} className="bg-white rounded-xl p-5 hover:shadow-md transition-all"
              style={{ border: '1px solid #e7e8e9', boxShadow: '0px 4px 12px rgba(0,0,0,0.04)' }}>
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="font-semibold text-[#191c1d] mb-1 text-sm">{card.title}</h3>
              <p className="text-xs text-[#707978] mb-3 leading-relaxed">{card.desc}</p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ background: '#e1e3e4', color: '#404848' }}>
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
