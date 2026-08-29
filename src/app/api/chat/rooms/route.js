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

        const numericUserId = parseInt(userId);

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

                u.full_name AS teacher_name,
                u.user_id AS teacher_id,

                (
                    SELECT COUNT(*)
                    FROM section_enrollments se
                    WHERE se.section_id = s.section_id
                ) AS student_count,

                (
                    SELECT message_text
                    FROM chat_messages
                    WHERE room_id = cr.room_id
                    ORDER BY sent_at DESC, message_id DESC
                    LIMIT 1
                ) AS last_message,

                (
                    SELECT sent_at
                    FROM chat_messages
                    WHERE room_id = cr.room_id
                    ORDER BY sent_at DESC, message_id DESC
                    LIMIT 1
                ) AS last_message_time

            FROM chat_rooms cr

            JOIN sections s
                ON cr.section_id = s.section_id

            JOIN courses c
                ON s.course_id = c.course_id

            LEFT JOIN users u
                ON s.teacher_id = u.user_id

            WHERE
                s.teacher_id = ?
                OR EXISTS (
                    SELECT 1
                    FROM section_enrollments se
                    WHERE se.section_id = s.section_id
                    AND se.student_id = ?
                )

            ORDER BY
                last_message_time DESC
        `, [
            numericUserId,
            numericUserId
        ]);

        return NextResponse.json(rooms);

    } catch (error) {
        console.error(
            'Error fetching chat rooms:',
            error
        );

        return NextResponse.json(
            {
                error: 'Failed to fetch chat rooms'
            },
            {
                status: 500
            }
        );
    }
}
