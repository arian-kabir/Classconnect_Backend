// app/api/chat/messages/route.js
import { query } from '@/lib/db/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit')) || 50;
        const offset = parseInt(searchParams.get('offset')) || 0;

        if (!roomId || !userId) {
            return NextResponse.json(
                { error: 'Room ID and User ID are required' },
                { status: 400 }
            );
        }

        const messages = await query(`
            SELECT 
                cm.message_id,
                cm.message_text,
                cm.message_type,
                cm.file_url,
                cm.sent_at,
                cm.is_read,
                cm.reply_to_message_id,
                cm.sender_id,
                u.full_name as sender_name,
                u.profile_picture,
                u.role
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.user_id
            WHERE cm.room_id = ?
            ORDER BY cm.sent_at ASC, cm.message_id ASC
            LIMIT ? OFFSET ?
        `, [roomId, limit, offset]);

        // Mark messages as read
        await query(`
            INSERT INTO message_read_status (message_id, user_id)
            SELECT message_id, ? 
            FROM chat_messages 
            WHERE room_id = ? AND sender_id != ?
            AND NOT EXISTS (
                SELECT 1 FROM message_read_status 
                WHERE message_id = chat_messages.message_id AND user_id = ?
            )
        `, [userId, roomId, userId, userId]);

        return NextResponse.json({
            messages: messages,
            pagination: { limit, offset, total: messages.length }
        });

    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { roomId, senderId, messageText, messageType = 'text', fileUrl = null, replyToMessageId = null } = body;

        if (!roomId || !senderId || !messageText) {
            return NextResponse.json(
                { error: 'Room ID, Sender ID, and message text are required' },
                { status: 400 }
            );
        }

        // Check authorization
        const authorization = await query(`
            SELECT 1 FROM section_enrollments se
            JOIN sections s ON se.section_id = s.section_id
            JOIN chat_rooms cr ON cr.section_id = s.section_id
            WHERE cr.room_id = ? AND se.student_id = ?
            UNION
            SELECT 1 FROM sections s
            JOIN chat_rooms cr ON cr.section_id = s.section_id
            WHERE cr.room_id = ? AND s.teacher_id = ?
        `, [roomId, senderId, roomId, senderId]);

        if (authorization.length === 0) {
            return NextResponse.json(
                { error: 'User is not authorized to send messages in this room' },
                { status: 403 }
            );
        }

        // Insert message
        const result = await query(`
            INSERT INTO chat_messages 
            (room_id, sender_id, message_text, message_type, file_url, reply_to_message_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [roomId, senderId, messageText, messageType, fileUrl, replyToMessageId]);

        // Get the inserted message
        const newMessage = await query(`
            SELECT 
                cm.*,
                u.full_name as sender_name,
                u.profile_picture,
                u.role
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.user_id
            WHERE cm.message_id = ?
        `, [result.insertId]);

        return NextResponse.json({
            success: true,
            message: newMessage[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}