// frontend/src/app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
    {/* baseUrl={process.env.NEXTAUTH_URL}
    basePath="/api/auth"> */}
      {children}
    </SessionProvider>
  );
}