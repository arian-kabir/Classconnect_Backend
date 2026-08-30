import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-[#4B4B4B] text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">ClassConnect Platform</h1>
      <div className="flex gap-4">
        <Link 
          href="/admin/material" 
          className="px-6 py-3 bg-[#596898] rounded-xl hover:bg-slate-600 font-semibold"
        >
          Module 1: Notes & Materials
        </Link>
        <Link 
          href="/routine" 
          className="px-6 py-3 bg-emerald-600 rounded-xl hover:bg-emerald-700 font-semibold"
        >
          Module 2: Routine & Admin
        </Link>
      </div>
    </div>
  );
}
