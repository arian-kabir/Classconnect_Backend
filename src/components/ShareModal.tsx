// frontend/src/components/ShareModal.tsx
'use client';

import { useState, useEffect } from 'react';

interface User {
    user_id: number;
    full_name: string;
    email: string;
    role: string;
    already_shared: number;
}

interface ShareModalProps {
    noteId: number;
    userId: number;
    isOpen: boolean;
    onClose: () => void;
    onShare: (userIds: number[]) => void;
}

export default function ShareModal({ noteId, userId, isOpen, onClose, onShare }: ShareModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [sharing, setSharing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen && noteId) {
            fetchShareableUsers();
        }
    }, [isOpen, noteId]);

    const fetchShareableUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/canvas/share?noteId=${noteId}&userId=${userId}`);
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleUser = (userId: number) => {
        const newSet = new Set(selectedUsers);
        if (newSet.has(userId)) {
            newSet.delete(userId);
        } else {
            newSet.add(userId);
        }
        setSelectedUsers(newSet);
    };

    const handleShare = async () => {
        if (selectedUsers.size === 0) return;
        setSharing(true);
        await onShare(Array.from(selectedUsers));
        setSharing(false);
        onClose();
    };

    if (!isOpen) return null;

    const filteredUsers = users.filter(user =>
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Share Note</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                {/* Search */}
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* User List */}
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {loading ? (
                        <p className="text-gray-500 text-center py-4">Loading users...</p>
                    ) : filteredUsers.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No users available to share with</p>
                    ) : (
                        filteredUsers.map(user => (
                            <label
                                key={user.user_id}
                                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                    selectedUsers.has(user.user_id)
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:bg-gray-50'
                                } ${user.already_shared ? 'opacity-50' : ''}`}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                                        {user.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{user.full_name}</p>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                        <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                                    </div>
                                </div>
                                {user.already_shared ? (
                                    <span className="text-sm text-gray-400">Already shared</span>
                                ) : (
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.has(user.user_id)}
                                        onChange={() => handleToggleUser(user.user_id)}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                )}
                            </label>
                        ))
                    )}
                </div>

                {/* Selected count & Share button */}
                <div className="flex justify-between items-center border-t pt-4">
                    <span className="text-sm text-gray-500">
                        {selectedUsers.size} user(s) selected
                    </span>
                    <button
                        onClick={handleShare}
                        disabled={selectedUsers.size === 0 || sharing}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {sharing ? 'Sharing...' : 'Share Note'}
                    </button>
                </div>
            </div>
        </div>
    );
}