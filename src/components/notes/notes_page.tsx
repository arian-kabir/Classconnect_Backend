// src/components/notes/notes_page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import ExcalidrawCanvas from '@/components/ExcalidrawCanvas';

interface Note {
  id: number;
  title: string;
  content: any;
  text_content: string;
  user_id: number;
  section_id: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { data: session, status } = useSession();
const [sectionId, setSectionId] = useState<number | null>(null);
const userId = session?.user?.id ? parseInt(session.user.id) : null;

// // Fetch user's enrolled sections
// useEffect(() => {
//   if (userId) {
//     fetch(`/api/user/sections?userId=${userId}`)
//       .then(res => res.json())
//       .then(data => {
//         if (data.sections && data.sections.length > 0) {
//           setSectionId(data.sections[0].section_id);
//         }
//       })
//       .catch(err => console.error('Error fetching sections:', err));
//   }
// }, [userId]);

// if (status === 'loading' || sectionId === null) {
//   return <div>Loading...</div>;
// }

// if (!userId) {
//   return <div>Please sign in to view notes</div>;
// }

  const fetchNotes = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
    
      const res = await fetch(`/api/notes?userId=${userId}`);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        setNotes(data.data);

        if (data.data.length > 0 && !selectedNote) {
          setSelectedNote(data.data[0]);
        }
      } else {
        setError('Failed to fetch notes');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Error loading notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (): Promise<void> => {
    try {
      // const res = await fetch('/api/notes', {
      const res = await fetch('http://localhost:3001/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Note ${notes.length + 1}`,
          content: { type: 'excalidraw', elements: [] },
          text_content: '',
          user_id: userId,
          // section_id: sectionId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchNotes();
        setSelectedNote(data.data);
      }
    } catch (error) {
      console.error('Create error:', error);
    }
  };

  const deleteNote = async (noteId: number): Promise<void> => {
    if (!confirm('Delete this note?')) return;

    try {
      const res = await fetch(
        `/api/notes/${noteId}?userId=${userId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await res.json();

      if (data.success) {
        await fetchNotes();

        if (selectedNote?.id === noteId) {
          setSelectedNote(
            notes.find((n) => n.id !== noteId) || null
          );
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleNoteSelect = (note: Note): void => {
    setSelectedNote(note);
  };

  const handleNoteUpdate = (updatedNote: Note): void => {
    setSelectedNote(updatedNote);
    fetchNotes();
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  if (loading) {
    return (
      <div className="notes-loading-screen">
        <div className="notes-loading-card">
          <div className="notes-spinner" />
          <p>Loading your notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notes-loading-screen">
        <div className="notes-error-card">
          <div className="notes-error-icon">!</div>
          <h2>Unable to load notes</h2>
          <p>{error}</p>

          <button
            onClick={fetchNotes}
            className="notes-retry-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-page">
      {/* Sidebar */}
      <aside className="notes-sidebar">
        <div className="notes-sidebar-header">
          <div>
            <p className="notes-eyebrow">Workspace</p>
            <h1 className="notes-title">My Notes</h1>
          </div>

          <div className="notes-count">
            {notes.length}
          </div>
        </div>

        <button
          onClick={createNote}
          className="new-note-button"
        >
          <span className="new-note-icon">+</span>
          <span>New Note</span>
        </button>

        <div className="notes-list">
          {notes.length === 0 ? (
            <div className="empty-notes">
              <div className="empty-notes-icon">✎</div>
              <h3>No notes yet</h3>
              <p>Create your first note to start drawing.</p>
            </div>
          ) : (
            notes.map((note) => {
              const isSelected = selectedNote?.id === note.id;

              return (
                <div
                  key={note.id}
                  onClick={() => handleNoteSelect(note)}
                  className={`note-card ${
                    isSelected ? 'note-card-selected' : ''
                  }`}
                >
                  <div className="note-card-main">
                    <div className="note-card-icon">
                      ✎
                    </div>

                    <div className="note-card-content">
                      <div className="note-card-title">
                        {note.title}
                      </div>

                      <div className="note-card-date">
                        {new Date(
                          note.updated_at
                        ).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    className="delete-note-button"
                    aria-label={`Delete ${note.title}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5" />
                      <path d="M14 11v5" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="notes-sidebar-footer">
          <span className="sidebar-status-dot" />
          <span>Notes workspace</span>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="notes-workspace">
        {selectedNote ? (
          <>
            <header className="notes-workspace-header">
              <div className="workspace-note-info">
                <div className="workspace-note-icon">
                  ✎
                </div>

                <div>
                  <h2>{selectedNote.title}</h2>
                  <p>
                    Last updated{' '}
                    {new Date(
                      selectedNote.updated_at
                    ).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="workspace-note-status">
                <span className="status-dot" />
                Ready
              </div>
            </header>

            <div className="canvas-wrapper">
              <ExcalidrawCanvas
                key={`canvas-${selectedNote.id}-${selectedNote.updated_at}`}
                noteId={selectedNote.id}
                userId={userId}
                initialContent={selectedNote.content}
                onSave={handleNoteUpdate}
              />
            </div>
          </>
        ) : (
          <div className="empty-workspace">
            <div className="empty-workspace-icon">✎</div>

            <h2>Select a note</h2>

            <p>
              Choose a note from the sidebar or create a new
              one to start drawing.
            </p>

            <button
              onClick={createNote}
              className="empty-workspace-button"
            >
              <span>+</span>
              Create New Note
            </button>
          </div>
        )}
      </main>
    </div>
  );
}