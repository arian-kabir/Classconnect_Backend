// backend/src/lib/socket.js
import { Server } from 'socket.io';
import { query } from './db/db.js';

let io = null;

export function initSocket(server) {
    if (io) return io;

    io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join a chat room
        socket.on('join-room', async ({ roomId, userId }) => {
            socket.join(`room-${roomId}`);
            console.log(`User ${userId} joined room ${roomId}`);
            
            // Update user's online status
            socket.userId = userId;
            socket.roomId = roomId;
            
            // Broadcast to others in the room
            socket.to(`room-${roomId}`).emit('user-joined', { userId });
        });


        // Handle sending messages
        socket.on('send-message', async (data) => {
            try {
                const { roomId, senderId, messageText, messageType = 'text', fileUrl = null, replyToMessageId = null } = data;

                // Save to database
                const result = await query(`
                    INSERT INTO chat_messages 
                    (room_id, sender_id, message_text, message_type, file_url, reply_to_message_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [roomId, senderId, messageText, messageType, fileUrl, replyToMessageId]);

                // Get full message with sender info
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

                // Emit to everyone in the room
                io.to(`room-${roomId}`).emit('new-message', {
                    message: newMessage[0]
                });

            } catch (error) {
                console.error('Error sending message via socket:', error);
                socket.emit('message-error', { error: 'Failed to send message' });
            }
        });

        // Handle typing status
        socket.on('typing', async ({ roomId, userId, isTyping }) => {
            await query(`
                INSERT INTO typing_status (room_id, user_id, is_typing)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    is_typing = VALUES(is_typing),
                    last_updated = CURRENT_TIMESTAMP
            `, [roomId, userId, isTyping]);

            socket.to(`room-${roomId}`).emit('user-typing', {
                userId,
                isTyping
            });
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            if (socket.userId && socket.roomId) {
                io.to(`room-${socket.roomId}`).emit('user-left', {
                    userId: socket.userId
                });
            }
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
}

export function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}