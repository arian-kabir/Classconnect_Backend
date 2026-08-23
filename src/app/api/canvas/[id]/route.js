// app/api/canvas/[id]/route.js
import { query } from '@/lib/db/db';
import { NextResponse } from 'next/server';

// GET: Fetch a specific note
export async function GET(request, { params }) {
    try {
        // IMPORTANT: In Next.js App Router, params is a Promise
        const { id } = await params;

        console.log('GET Single Note - ID:', id);

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        console.log('UserId:', userId);

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'userId is required' },
                { status: 400 }
            );
        }

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Note ID is required' },
                { status: 400 }
            );
        }

        const noteId = parseInt(id);
        if (isNaN(noteId) || noteId <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid note ID' },
                { status: 400 }
            );
        }

        const sql = `
            SELECT 
                n.id,
                n.title,
                n.content,
                n.text_content,
                n.user_id,
                n.section_id,
                n.is_archived,
                n.created_at,
                n.updated_at
            FROM notes n
            WHERE n.id = ? AND n.user_id = ?
        `;

        const note = await query(sql, [noteId, parseInt(userId)]);

        if (note.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Note not found or access denied' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                ...note[0],
                content: note[0].content ? JSON.parse(note[0].content) : null
            }
        });

    } catch (error) {
        console.error('Error fetching note:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch note', details: error.message },
            { status: 500 }
        );
    }
}

// PUT: Update a note
export async function PUT(request, { params }) {
    try {
        // IMPORTANT: In Next.js App Router, params is a Promise
        const { id } = await params;

        console.log('PUT Single Note - ID:', id);

        const body = await request.json();
        console.log('Request body:', body);

        const userId = body.userId || body.user_id;
        const title = body.title;
        const content = body.content;
        const text_content = body.text_content;
        const is_archived = body.is_archived;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'userId is required' },
                { status: 400 }
            );
        }

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Note ID is required' },
                { status: 400 }
            );
        }

        const noteId = parseInt(id);
        if (isNaN(noteId) || noteId <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid note ID' },
                { status: 400 }
            );
        }

        // Check if note exists and user owns it
        const checkSql = 'SELECT user_id FROM notes WHERE id = ?';
        const checkResult = await query(checkSql, [noteId]);

        if (checkResult.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Note not found' },
                { status: 404 }
            );
        }

        if (checkResult[0].user_id !== parseInt(userId)) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to edit this note' },
                { status: 403 }
            );
        }

        // Build update query dynamically
        const updateFields = [];
        const updateParams = [];

        if (title !== undefined && title !== null) {
            updateFields.push('title = ?');
            updateParams.push(title);
        }
        if (content !== undefined && content !== null) {
            updateFields.push('content = ?');
            updateParams.push(JSON.stringify(content));
        }
        if (text_content !== undefined && text_content !== null) {
            updateFields.push('text_content = ?');
            updateParams.push(text_content);
        }
        if (is_archived !== undefined && is_archived !== null) {
            updateFields.push('is_archived = ?');
            updateParams.push(is_archived ? 1 : 0);
        }

        if (updateFields.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No fields to update' },
                { status: 400 }
            );
        }

        updateParams.push(noteId);
        const updateSql = `
            UPDATE notes 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        console.log('Update SQL:', updateSql);
        console.log('Update Params:', updateParams);

        await query(updateSql, updateParams);

        // Fetch updated note
        const fetchSql = `
            SELECT 
                n.id,
                n.title,
                n.content,
                n.text_content,
                n.user_id,
                n.section_id,
                n.is_archived,
                n.created_at,
                n.updated_at
            FROM notes n
            WHERE n.id = ?
        `;

        const updatedNote = await query(fetchSql, [noteId]);

        return NextResponse.json({
            success: true,
            data: {
                ...updatedNote[0],
                content: updatedNote[0]?.content ? (typeof updatedNote[0].content === 'string' ? JSON.parse(updatedNote[0].content) : updatedNote[0].content) : null
            },
            message: 'Note updated successfully'
        });

    } catch (error) {
        console.error('Error updating note:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update note', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE: Soft delete or permanent delete
export async function DELETE(request, { params }) {
    try {
        // IMPORTANT: In Next.js App Router, params is a Promise
        const { id } = await params;

        console.log('DELETE Single Note - ID:', id);

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const permanent = searchParams.get('permanent') === 'true';

        console.log('UserId:', userId, 'Permanent:', permanent);

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'userId is required' },
                { status: 400 }
            );
        }

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Note ID is required' },
                { status: 400 }
            );
        }

        const noteId = parseInt(id);
        if (isNaN(noteId) || noteId <= 0) {
            return NextResponse.json(
                { success: false, error: 'Invalid note ID' },
                { status: 400 }
            );
        }

        // Check if note exists and user owns it
        const checkSql = 'SELECT user_id FROM notes WHERE id = ?';
        const checkResult = await query(checkSql, [noteId]);

        if (checkResult.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Note not found' },
                { status: 404 }
            );
        }

        if (checkResult[0].user_id !== parseInt(userId)) {
            return NextResponse.json(
                { success: false, error: 'You do not have permission to delete this note' },
                { status: 403 }
            );
        }

        if (permanent) {
            await query('DELETE FROM notes WHERE id = ?', [noteId]);
            return NextResponse.json({
                success: true,
                message: 'Note permanently deleted'
            });
        } else {
            await query('UPDATE notes SET is_archived = TRUE WHERE id = ?', [noteId]);
            return NextResponse.json({
                success: true,
                message: 'Note archived successfully'
            });
        }

    } catch (error) {
        console.error('Error deleting note:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete note', details: error.message },
            { status: 500 }
        );
    }
}