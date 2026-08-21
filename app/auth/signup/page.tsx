'use client';

import { useState, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ROLE_OPTIONS = [
  { value: 'student', label: 'University Student' },
  { value: 'teacher', label: 'Faculty Member' },
  { value: 'student_tutor', label: 'Student Tutor' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error || 'Registration failed.'); setLoading(false); return; }

      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) { setSuccess(true); setTimeout(() => router.push('/auth/login'), 2000); }
      else { router.push('/dashboard'); }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl: '/dashboard' });
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#002626';
    e.target.style.boxShadow = '0 0 0 2px rgba(0,38,38,0.15)';
  };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#c0c8c7';
    e.target.style.boxShadow = 'none';
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e1e3e4 100%)' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#d4e7dd] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#002626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#191c1d] mb-2" style={{ fontFamily: 'Hanken Grotesk, system-ui, sans-serif' }}>Account created!</h2>
          <p className="text-sm text-[#404848]" style={{ fontFamily: 'Hanken Grotesk, system-ui, sans-serif' }}>Redirecting you to login…</p>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 text-sm rounded-lg bg-white border border-[#c0c8c7] text-[#191c1d] placeholder-[#707978] outline-none transition-all";
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-[#404848] mb-2";
  const font = { fontFamily: 'Hanken Grotesk, system-ui, sans-serif' };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e1e3e4 100%)' }}>
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{ backgroundImage: 'radial-gradient(#c0c8c7 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative w-full max-w-md" style={{ animation: 'fadeInUp 0.4s ease forwards' }}>
        <div className="bg-white rounded-xl p-8 md:p-10"
          style={{ boxShadow: '0px 8px 40px rgba(0,38,38,0.12)', border: '1px solid #e7e8e9' }}>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#002626]" />
              <div className="flex flex-col gap-1">
                <span className="w-2.5 h-1.5 rounded-full bg-[#002626]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#002626]" />
              </div>
            </div>
            <Link href="/" className="text-xl font-bold tracking-tight text-[#002626]" style={font}>ClassConnect</Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-[#191c1d] mb-1" style={font}>Create your account</h1>
            <p className="text-sm text-[#404848]">Join your university&apos;s academic hub</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-lg bg-[#ffdad6] border border-[#93000a]/20">
              <svg className="w-4 h-4 text-[#93000a] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-[#93000a] font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className={labelClass} style={font}>Full Name</label>
              <input id="fullName" type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="John Doe" onFocus={onFocus} onBlur={onBlur} className={inputClass} style={font} />
            </div>
            <div>
              <label htmlFor="email" className={labelClass} style={font}>University Email</label>
              <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@university.edu" onFocus={onFocus} onBlur={onBlur} className={inputClass} style={font} />
            </div>
            <div>
              <label htmlFor="role" className={labelClass} style={font}>Role</label>
              <select id="role" value={role} onChange={e => setRole(e.target.value)}
                onFocus={onFocus} onBlur={onBlur}
                className="w-full px-4 py-3 text-sm rounded-lg bg-white border border-[#c0c8c7] text-[#191c1d] outline-none appearance-none cursor-pointer transition-all"
                style={font}>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="password" className={labelClass} style={font}>Password</label>
              <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters" onFocus={onFocus} onBlur={onBlur} className={inputClass} style={font} />
            </div>
            <div>
              <label htmlFor="confirmPassword" className={labelClass} style={font}>Confirm Password</label>
              <input id="confirmPassword" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••" onFocus={onFocus} onBlur={onBlur} className={inputClass} style={font} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all mt-2"
              style={{ ...font, background: '#002626', boxShadow: '0px 4px 12px rgba(0,38,38,0.25)' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#003d3d'; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#002626'; }}>
              {loading ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Creating Account…</> : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#c0c8c7]" />
            <span className="text-xs text-[#707978] font-medium">OR</span>
            <div className="flex-1 h-px bg-[#c0c8c7]" />
          </div>

          <button onClick={handleGoogleSignIn} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg text-sm font-semibold text-[#191c1d] border border-[#c0c8c7] bg-white hover:bg-[#f3f4f5] hover:border-[#707978] disabled:opacity-60 transition-all"
            style={font}>
            {googleLoading
              ? <span className="w-4 h-4 rounded-full border-2 border-[#191c1d] border-t-transparent animate-spin" />
              : <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>}
            Sign up with Google
          </button>

          <p className="text-center text-sm text-[#404848] mt-6" style={font}>
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-[#002626] hover:underline">Sign in</Link>
          </p>
        </div>
        <p className="text-center text-xs text-[#707978] mt-4" style={font}>
          By creating an account you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
      <style jsx global>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
