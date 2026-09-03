// frontend/src/lib/chat-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export const chatApi = {
  getRooms: (userId: number) =>
    fetch(`${API_BASE_URL}/api/chat/rooms?userId=${userId}`).then(res => res.json()),
  
  getMessages: (roomId: number, userId: number, limit = 50, offset = 0) =>
    fetch(`${API_BASE_URL}/api/chat/messages?roomId=${roomId}&userId=${userId}&limit=${limit}&offset=${offset}`).then(res => res.json()),
  
  getRoomUsers: (roomId: number) =>
    fetch(`${API_BASE_URL}/api/chat/room-users?roomId=${roomId}`).then(res => res.json()),
  
  sendMessage: (data: any) =>
    fetch(`${API_BASE_URL}/api/chat/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json()),
};