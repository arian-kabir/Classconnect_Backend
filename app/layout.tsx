// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
// import Navbar from '@/components/NavBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "ClassConnect — University Repository & Communication Platform",
  description: "Consolidate your course materials, communications, and schedules into one intelligent academic hub.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
   <html lang="en">
      <body className={inter.className}>
        <Providers>
          {/* <Navbar /> */}
          <main className="min-h-screen bg-transparent font-sans text-slate-800 transition-colors duration-200 dark:text-slate-200">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

