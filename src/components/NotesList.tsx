'use client';

import { useState, useEffect } from 'react';

interface Note {
  _id: string;
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
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    content: ''
  });
  const [updating, setUpdating] = useState(false);
console.log("notes", notes);
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
        setNotes(notes.filter(note => note._id !== id));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete note');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setEditForm({
      title: note.title,
      content: note.content
    });
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setEditForm({ title: '', content: '' });
  };

  const updateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote) return;

    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notes/${editingNote._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(notes.map(note => 
          note._id === editingNote._id ? data.note : note
        ));
        setEditingNote(null);
        setEditForm({ title: '', content: '' });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update note');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setUpdating(false);
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
        <div key={note._id as string} className="bg-white shadow-md rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{note.title}</h3>
              <p className="text-gray-600 mt-2">{note.content}</p>
              <p className="text-xs text-gray-400 mt-2">
                Created: {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => startEdit(note)}
                className="text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
              <button
                onClick={() => deleteNote(note._id as string)}
                className="text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Edit Modal */}
      {editingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Note</h3>
            <form onSubmit={updateNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  required
                />
              </div>
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={updating}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {updating ? 'Updating...' : 'Update Note'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
