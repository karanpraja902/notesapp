'use client';

import { useState, useEffect } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface NotesListProps {
  refreshTrigger: number;
}

export default function NotesList({ refreshTrigger }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notes', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setNotes(data.notes);
        setError('');
      } else {
        setError(data.error || 'Failed to fetch notes');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotes(notes.filter(note => note.id !== id));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete note');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [refreshTrigger]);

  if (loading) {
    return <div className="text-center">Loading notes...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  if (notes.length === 0) {
    return <div className="text-gray-500 text-center">No notes yet. Create your first note!</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Your Notes</h2>
      {notes.map((note) => (
        <div key={note.id} className="bg-white shadow-md rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{note.title}</h3>
              <p className="text-gray-600 mt-2">{note.content}</p>
              <p className="text-xs text-gray-400 mt-2">
                Created: {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => deleteNote(note.id)}
              className="text-red-600 hover:text-red-800 ml-4"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
