// frontend/src/components/ChatRoom.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { chatApi } from '@/lib/chat-client';

interface Message {
  message_id: number;
  message_text: string;
  sender_name: string;
  sender_id: number;
  sent_at: string;
}

interface ChatRoomProps {
  roomId: number;
  userId: number;
  roomName: string;
}

export default function ChatRoom({ roomId, userId, roomName }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocket(userId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await chatApi.getMessages(roomId, userId);
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [roomId, userId]);

  // Join room on socket connect
  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('join-room', { roomId, userId });
    }
  }, [socket, isConnected, roomId, userId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    socket.on('new-message', (data: any) => {
      setMessages(prev => [...prev, data.message]);
    });

    return () => {
      socket.off('new-message');
    };
  }, [socket]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    const messageData = {
      roomId,
      senderId: userId,
      messageText: input.trim(),
    };

    socket.emit('send-message', messageData);
    setInput('');
  };

  if (loading) {
    return <div className="p-4">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold">{roomName}</h3>
        <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
          {isConnected ? '● Online' : '● Offline'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px]">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.message_id}
              className={`p-2 rounded max-w-[70%] ${
                msg.sender_id === userId
                  ? 'bg-blue-500 text-white ml-auto'
                  : 'bg-gray-100'
              }`}
            >
              <p className="text-xs font-semibold">{msg.sender_name}</p>
              <p>{msg.message_text}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(msg.sent_at).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!isConnected}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}