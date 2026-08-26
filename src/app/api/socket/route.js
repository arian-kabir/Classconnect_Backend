// backend/src/app/api/socket/route.js
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(
        { message: 'Socket.IO is running' },
        { status: 200 }
    );
}
