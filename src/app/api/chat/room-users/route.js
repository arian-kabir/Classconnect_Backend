// app/api/chat/room-users/route.js
import { query } from '@/lib/db/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');

        if (!roomId) {
            return NextResponse.json(
                { error: 'Room ID is required' },
                { status: 400 }
            );
        }

        const users = await query(`
            SELECT DISTINCT
                u.user_id,
                u.full_name,
                u.email,
                u.role,
                u.profile_picture,
                u.last_active,
                CASE 
                    WHEN s.teacher_id = u.user_id THEN 'teacher'
                    ELSE 'student'
                END as user_type,
                (SELECT is_typing FROM typing_status 
                 WHERE room_id = ? AND user_id = u.user_id) as is_typing
            FROM chat_rooms cr
            JOIN sections s ON cr.section_id = s.section_id
            LEFT JOIN section_enrollments se ON s.section_id = se.section_id
            LEFT JOIN users u ON (se.student_id = u.user_id OR s.teacher_id = u.user_id)
            WHERE cr.room_id = ?
            ORDER BY 
                CASE WHEN s.teacher_id = u.user_id THEN 0 ELSE 1 END,
                u.full_name
        `, [roomId, roomId]);

        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching room users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch room users' },
            { status: 500 }
        );
    }
}