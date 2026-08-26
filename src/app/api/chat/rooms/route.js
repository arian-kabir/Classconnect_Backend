// app/api/chat/rooms/route.js
import { query } from '@/lib/db/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }
        
        // Get all chat rooms for a user (sections they're enrolled in or teaching)
        const rooms = await query(`
        SELECT DISTINCT 
                cr.room_id,
                cr.room_name,
                cr.section_id,
                s.section_code,
                s.semester,
                s.year,
                c.course_code,
                c.course_name,
                u.full_name as teacher_name,
                u.user_id as teacher_id,
                (SELECT COUNT(*) FROM section_enrollments se WHERE se.section_id = s.section_id) as student_count,
                (SELECT COUNT(*) FROM chat_messages cm WHERE cm.room_id = cr.room_id 
                 AND cm.sent_at > IFNULL(
                    (SELECT MAX(mrs.read_at) FROM message_read_status mrs 
                     WHERE mrs.message_id = cm.message_id AND mrs.user_id = ?),
                    '1970-01-01'
                 )) as unread_count,
                (SELECT message_text FROM chat_messages 
                 WHERE room_id = cr.room_id 
                 ORDER BY sent_at DESC LIMIT 1) as last_message,
                (SELECT sent_at FROM chat_messages 
                 WHERE room_id = cr.room_id 
                 ORDER BY sent_at DESC LIMIT 1) as last_message_time
            FROM chat_rooms cr
            JOIN sections s ON cr.section_id = s.section_id
            JOIN courses c ON s.course_id = c.course_id
            LEFT JOIN users u ON s.teacher_id = u.user_id
            LEFT JOIN section_enrollments se ON s.section_id = se.section_id
            WHERE se.student_id = ? OR s.teacher_id = ?
            ORDER BY last_message_time DESC
        `, [userId, userId, userId]);
        

        return NextResponse.json(rooms);
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chat rooms' },
            { status: 500 }
        );
    }
}