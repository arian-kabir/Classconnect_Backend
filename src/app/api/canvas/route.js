// app/api/notes/route.js
import { query } from '@/lib/db/db';
import { NextResponse } from 'next/server';

// GET: Fetch all notes for a user
export async function GET(request) {
    try {
        console.log('=== GET /api/notes called ===');
        
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const sectionId = searchParams.get('sectionId');
        const isArchived = searchParams.get('isArchived') === 'true';
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        console.log('Query params:', { userId, sectionId, isArchived, limit, offset });

        // Validation
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'userId is required' },
                { status: 400 }
            );
        }

        // Build main query
        let sql = `
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
            WHERE n.user_id = ?
        `;
        
        const params = [parseInt(userId)];

        // Add section filter if provided
        if (sectionId && !isNaN(sectionId)) {
            sql += ` AND n.section_id = ?`;
            params.push(parseInt(sectionId));
        }

        // Add archive filter
        sql += ` AND n.is_archived = ?`;
        params.push(isArchived ? 1 : 0);

        // Order and pagination
        sql += ` ORDER BY n.updated_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        console.log('SQL Query:', sql);
        console.log('SQL Params:', params);

        const notes = await query(sql, params);
        console.log('Notes found:', notes.length);

        // Parse JSON content for each note
        const processedNotes = notes.map(note => ({
            ...note,
        content: note.content ? (typeof note.content === 'string' ? JSON.parse(note.content) : note.content) : null
        }));

        // Build count query
        let countSql = `
            SELECT COUNT(*) as total 
            FROM notes 
            WHERE user_id = ? AND is_archived = ?
        `;
        let countParams = [parseInt(userId), isArchived ? 1 : 0];
        
        if (sectionId && !isNaN(sectionId)) {
            countSql += ` AND section_id = ?`;
            countParams.push(parseInt(sectionId));
        }
        
        const countResult = await query(countSql, countParams);
        const total = countResult[0]?.total || 0;

        return NextResponse.json({
            success: true,
            data: processedNotes,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: offset + limit < total
            }
        });
    
    } catch (error) {
        console.error('ERROR in GET /api/notes:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch notes',
                details: error.message
            },
            { status: 500 }
        );
    }
}




// POST: Create a new note
export async function POST(request) {
    try {
        console.log('=== POST /api/notes called ===');
        
        const body = await request.json();
        console.log('Request body:', body);
        
        const { 
            title, 
            content, 
            text_content, 
            user_id, 
            section_id
        } = body;

        // Validation
        if (!title || !user_id) {
            console.log('Validation failed:', { title, user_id});
            return NextResponse.json(
                { success: false, error: 'title and user_id are required' },
                { status: 400 }
            );
        }

        // Insert note
        const insertSql = `
            INSERT INTO notes (title, content, text_content, user_id, section_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const insertParams = [
            title,
            content ? JSON.stringify(content) : null,
            text_content || '',
            parseInt(user_id),
            section_id ? parseInt(section_id) : null
        ];
        
        console.log('Insert SQL:', insertSql);
        console.log('Insert Params:', insertParams);
        
        const result = await query(insertSql, insertParams);
        console.log('Insert result:', result);

        const noteId = result.insertId;

        // Fetch the created note
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
        
        const note = await query(fetchSql, [noteId]);

        return NextResponse.json({
            success: true,
            data: {
                ...note[0],
                content: note[0]?.content ? (typeof note[0].content === 'string' ? JSON.parse(note[0].content) : note[0].content) : null
            },
            message: 'Note created successfully'
        }, { status: 201 });

    } catch (error) {
        console.error('ERROR in POST /api/notes:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to create note',
                details: error.message
            },
            { status: 500 }
        );
    }
}