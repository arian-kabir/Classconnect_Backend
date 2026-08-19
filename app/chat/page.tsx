// frontend/app/chat/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
        💬 Chat
      </h1>
      <p className="text-slate-600 dark:text-slate-300">
        Chat functionality coming soon! This is a placeholder page.
      </p>
    </div>
  );
}