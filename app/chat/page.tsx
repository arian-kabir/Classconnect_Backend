// // frontend/app/chat/page.tsx
// 'use client';

// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import { useEffect } from 'react';

// export default function ChatPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();

//   useEffect(() => {
//     if (status === 'unauthenticated') {
//       router.push('/auth/signin');
//     }
//   }, [status, router]);

//   if (status === 'loading') {
//     return (
//       <div className="flex items-center justify-center h-screen">
//         <p>Loading...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto px-8 py-12">
//       <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
//         💬 Chat
//       </h1>
//       <p className="text-slate-600 dark:text-slate-300">
//         Chat functionality coming soon! This is a placeholder page.
//       </p>
//     </div>
//   );
// }
// frontend/app/chat/page.tsx
'use client';

import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ChatRoom from '@/components/chatrooms';
import { chatApi } from '@/lib/chat-client';//

interface ChatRoom {
  room_id: number;
  room_name: string;
  section_id: number;
  last_message?: string;
}

export default function ChatPage() {
  // const { data: session, status } = useSession();
  // const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);

  // const userId = session?.user?.id ? parseInt(session.user.id) : null;
    const userId = 1; 
  // useEffect(() => {
  //   if (status === 'unauthenticated') {
  //     router.push('/auth/signin');
  //   }
  // }, [status, router]);

  useEffect(() => {
    if (userId) {
      chatApi.getRooms(userId)
        .then(data => {
          setRooms(Array.isArray(data) ? data : []);
          if (data.length > 0) setSelectedRoom(data[0]);
        })
        .catch(err => console.error('Error fetching rooms:', err))
        .finally(() => setLoading(false));
    }
  }, [userId]);

  // if (status === 'loading' || loading) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
        💬 Chat
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Room List */}
        <div className="md:col-span-1 bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Rooms</h3>
          {rooms.length === 0 ? (
            <p className="text-gray-500 text-sm">No chat rooms available</p>
          ) : (
            <ul className="space-y-2">
              {rooms.map(room => (
                <li key={room.room_id}>
                  <button
                    onClick={() => setSelectedRoom(room)}
                    className={`w-full text-left p-2 rounded hover:bg-gray-100 text-sm ${
                      selectedRoom?.room_id === room.room_id ? 'bg-gray-100' : ''
                    }`}
                  >
                    {room.room_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Chat Room */}
        <div className="md:col-span-3 h-[500px]">
          {selectedRoom && userId ? (
            <ChatRoom
              roomId={selectedRoom.room_id}
              userId={userId}
              roomName={selectedRoom.room_name}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-white rounded-lg border text-gray-500">
              Select a room to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}