// backend/src/app/api/canvas/share/route.js
import { query } from '@/lib/db/db';
import { NextResponse } from 'next/server';

// GET: Get all users a note can be shared with
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const noteId = searchParams.get('noteId');
        const userId = searchParams.get('userId');

        if (!noteId || !userId) {
            return NextResponse.json(
                { error: 'Note ID and User ID are required' },
                { status: 400 }
            );
        }

        // Simple query without already_shared
        const users = await query(`
            SELECT DISTINCT 
                u.user_id,
                u.full_name,
                u.email,
                u.role,
                u.profile_picture
            FROM users u
            JOIN section_enrollments se ON se.student_id = u.user_id
            WHERE se.section_id IN (
                SELECT section_id FROM notes WHERE id = ?
            )
            AND u.user_id != ?
            UNION
            SELECT DISTINCT 
                u.user_id,
                u.full_name,
                u.email,
                u.role,
                u.profile_picture
            FROM users u
            JOIN sections s ON s.teacher_id = u.user_id
            WHERE s.section_id IN (
                SELECT section_id FROM notes WHERE id = ?
            )
            AND u.user_id != ?
        `, [noteId, userId, noteId, userId]);

        return NextResponse.json({ users });

    } catch (error) {
        console.error('Error fetching shareable users:', error);
        return NextResponse.json(
            { error: error.message, users: [] },
            { status: 500 }
        );
    }
}
// POST: Share a note with users
export async function POST(request) {
    try {
        const body = await request.json();
        const { noteId, ownerId, sharedWithUserIds, permission = 'view' } = body;

        if (!noteId || !ownerId || !sharedWithUserIds || sharedWithUserIds.length === 0) {
            return NextResponse.json(
                { error: 'Note ID, Owner ID, and at least one user ID are required' },
                { status: 400 }
            );
        }

        // Get note details for chat message
        const [note] = await query(`
            SELECT title, content, text_content, section_id 
            FROM notes WHERE id = ? AND user_id = ?
        `, [noteId, ownerId]);

        if (!note) {
            return NextResponse.json(
                { error: 'Note not found or you do not have permission to share it' },
                { status: 404 }
            );
        }

        const results = [];

        for (const sharedUserId of sharedWithUserIds) {
            // Check if already shared
            const [existing] = await query(
                'SELECT id FROM note_shares WHERE note_id = ? AND shared_with_user_id = ?',
                [noteId, sharedUserId]
            );

            if (existing) {
                results.push({ userId: sharedUserId, status: 'already_shared' });
                continue;
            }

            // Create share entry
            await query(`
                INSERT INTO note_shares (note_id, shared_with_user_id, permission)
                VALUES (?, ?, ?)
            `, [noteId, sharedUserId, permission]);

            // Create a copy of the note for the shared user
            const copyResult = await query(`
                INSERT INTO notes (title, content, text_content, user_id, section_id)
                VALUES (?, ?, ?, ?, ?)
            `, [
                `[Shared] ${note.title}`,
                JSON.stringify(note.content), 
                note.text_content ? `Shared from ${ownerId}:\n${note.text_content}` : '',
                sharedUserId,
                note.section_id
            ]);

            // Send chat notification (optional)
            await query(`
                INSERT INTO chat_messages (room_id, sender_id, message_text)
                SELECT 
                    cr.room_id,
                    ?,
                    CONCAT('📝 shared a note with you: ', ?)
                FROM chat_rooms cr
                JOIN section_enrollments se ON se.section_id = cr.section_id
                WHERE se.student_id = ? AND cr.section_id = ?
                LIMIT 1
            `, [ownerId, note.title, sharedUserId, note.section_id]);

            results.push({ userId: sharedUserId, status: 'shared', copyId: copyResult.insertId });
        }

        return NextResponse.json({
            success: true,
            message: `Note shared with ${results.length} user(s)`,
            results
        });

    } catch (error) {
        console.error('Error sharing note:', error);
        return NextResponse.json(
            { error: 'Failed to share note' },
            { status: 500 }
        );
    }
}