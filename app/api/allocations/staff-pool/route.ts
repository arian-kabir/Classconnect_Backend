import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    staffPool: [
      { userId: 1, fullName: 'Dr. Sarah Chen', email: 'sarah.chen@bracu.ac.bd', role: 'teacher', initials: 'SC' },
      { userId: 2, fullName: 'Prof. Alan Turing', email: 'alan.turing@bracu.ac.bd', role: 'teacher', initials: 'AT' },
      { userId: 3, fullName: 'Grace Hopper', email: 'grace.hopper@bracu.ac.bd', role: 'teacher', initials: 'GH' }
    ]
  });
}
