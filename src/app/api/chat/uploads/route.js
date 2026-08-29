// backend/src/app/api/chat/uploads/route.js

import { query } from '@/lib/db/db';
import { NextResponse } from 'next/server';
import {
    writeFile,
    mkdir
} from 'fs/promises';
import path from 'path';

import { getIO } from '@/lib/socket.js';

export async function POST(request) {

    try {

        const formData =
            await request.formData();

        const file =
            formData.get('file');

        const userId =
            formData.get('userId');

        const roomId =
            formData.get('roomId');

        if (!file || !userId || !roomId) {

            return NextResponse.json(
                {
                    error:
                        'File, userId, and roomId are required'
                },
                {
                    status: 400
                }
            );

        }

        /*
         * --------------------------------------------------------
         * Read uploaded file
         * --------------------------------------------------------
         */

        const bytes =
            await file.arrayBuffer();

        const buffer =
            Buffer.from(bytes);

        const fileName =
            file.name;

        const fileExtension =
            path.extname(fileName);

        const uniqueFileName =
            `${Date.now()}-${Math.random()
                .toString(36)
                .substring(7)}${fileExtension}`;

        /*
         * --------------------------------------------------------
         * Determine file type
         * --------------------------------------------------------
         */

        const isImage =
            [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp'
            ].includes(file.type);

        const isPDF =
            file.type === 'application/pdf';

        const messageType =
            isImage
                ? 'image'
                : 'file';

        /*
         * --------------------------------------------------------
         * Save physical file
         * --------------------------------------------------------
         */

        const uploadDir =
            path.join(
                process.cwd(),
                'public/uploads'
            );

        await mkdir(
            uploadDir,
            {
                recursive: true
            }
        );

        const filePath =
            path.join(
                uploadDir,
                uniqueFileName
            );

        await writeFile(
            filePath,
            buffer
        );

        /*
         * This URL is relative to the Next.js application.
         *
         * Example:
         *
         * /uploads/12345-file.pdf
         */

        const fileUrl = `/uploads/${uniqueFileName}`;

        /*
         * --------------------------------------------------------
         * Insert ONE chat message
         * --------------------------------------------------------
         */

        const result =
            await query(
                `
                INSERT INTO chat_messages
                (
                    room_id,
                    sender_id,
                    message_text,
                    message_type,
                    file_url
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    parseInt(roomId),
                    parseInt(userId),
                    `[${isImage
                        ? 'Image'
                        : isPDF
                            ? 'PDF'
                            : 'File'}] ${fileName}`,
                    messageType,
                    fileUrl
                ]
            );

        /*
         * --------------------------------------------------------
         * Get complete saved message
         * --------------------------------------------------------
         */

        const newMessage =
            await query(
                `
                SELECT
                    cm.*,
                    u.full_name AS sender_name,
                    u.profile_picture,
                    u.role
                FROM chat_messages cm
                JOIN users u
                    ON cm.sender_id = u.user_id
                WHERE cm.message_id = ?
                `,
                [result.insertId]
            );

        const message =
            newMessage[0];

        /*
         * --------------------------------------------------------
         * Broadcast the saved message.
         *
         * This is important:
         *
         * The frontend does NOT emit send-message for
         * attachments anymore.
         *
         * This single broadcast lets everyone in the room
         * receive the exact same database message.
         * --------------------------------------------------------
         */

        try {

            const io = getIO();

            io.to(
                `room-${parseInt(roomId)}`
            ).emit(
                'new-message',
                {
                    message
                }
            );

        } catch (socketError) {

            /*
             * Don't fail the upload just because the
             * Socket.IO instance isn't available.
             */

            console.error(
                'Socket broadcast error:',
                socketError
            );

        }

        return NextResponse.json(
            {
                success: true,
                message
            },
            {
                status: 201
            }
        );

    } catch (error) {

        console.error(
            'Error uploading file:',
            error
        );

        return NextResponse.json(
            {
                error:
                    'Failed to upload file'
            },
            {
                status: 500
            }
        );

    }

}