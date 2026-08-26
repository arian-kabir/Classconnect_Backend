// app/api/chat/upload/route.js
import { query } from '@/lib/db/db';
import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const userId = formData.get('userId');
        const roomId = formData.get('roomId');
        const messageType = formData.get('messageType') || 'file';

        if (!file || !userId || !roomId) {
            return NextResponse.json(
                { error: 'File, userId, and roomId are required' },
                { status: 400 }
            );
        }

        // Get file details
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = file.name;
        const fileExtension = path.extname(fileName);
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
        
        // Determine file type
        const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type);
        const isPDF = file.type === 'application/pdf';
        
        // Save file to uploads directory
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        await mkdir(uploadDir, { recursive: true });
        
        const filePath = path.join(uploadDir, uniqueFileName);
        await writeFile(filePath, buffer);

        const fileUrl = `/uploads/${uniqueFileName}`;

        // Insert message with file URL
        const result = await query(`
            INSERT INTO chat_messages 
            (room_id, sender_id, message_text, message_type, file_url)
            VALUES (?, ?, ?, ?, ?)
        `, [
            parseInt(roomId),
            parseInt(userId),
            `[${isImage ? 'Image' : isPDF ? 'PDF' : 'File'}] ${fileName}`,
            isImage ? 'image' : isPDF ? 'file' : 'file',
            fileUrl
        ]);

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
        console.error('Error uploading file:', error);
        return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
        );
    }
}