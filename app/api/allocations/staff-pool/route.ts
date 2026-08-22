import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    staffPool: [
      { id: 1, name: 'Dr. Sarah Chen', role: 'teacher' },
      { id: 2, name: 'Prof. Alan Turing', role: 'teacher' }
    ]
  });
}
