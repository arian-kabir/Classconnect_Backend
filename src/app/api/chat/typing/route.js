// app/api/chat/typing/route.js
import { query } from '@/lib/db/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { roomId, userId, isTyping } = body;

        if (!roomId || !userId) {
            return NextResponse.json(
                { error: 'Room ID and User ID are required' },
                { status: 400 }
            );
        }

        await query(`
            INSERT INTO typing_status (room_id, user_id, is_typing)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                is_typing = VALUES(is_typing),
                last_updated = CURRENT_TIMESTAMP
        `, [roomId, userId, isTyping]);

        return NextResponse.json({
            success: true,
            message: 'Typing status updated'
        });

    } catch (error) {
        console.error('Error updating typing status:', error);
        return NextResponse.json(
            { error: 'Failed to update typing status' },
            { status: 500 }
        );
    }
}