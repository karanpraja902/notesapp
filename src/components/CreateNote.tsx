'use client';

import { useState } from 'react';

interface CreateNoteProps {
  onNoteCreated: () => void;
  onLimitReached: () => void;
  currentNoteCount?: number;
  noteLimit?: number;
  isProPlan?: boolean;
}

export default function CreateNote({ onNoteCreated, onLimitReached, currentNoteCount = 0, noteLimit = 3, isProPlan = false }: CreateNoteProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });

      const data = await response.json();

      if (response.ok) {
        setTitle('');
        setContent('');
        onNoteCreated();
      } else if (data.limitReached) {
        onLimitReached();
        setError(data.error);
      } else {
        setError(data.error || 'Failed to create note');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAtLimit = !isProPlan && currentNoteCount >= noteLimit;

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Create New Note</h2>
        {!isProPlan && (
          <div className="text-sm text-gray-600">
            {currentNoteCount} / {noteLimit} notes
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <div>
          <input
            type="text"
            placeholder="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <textarea
            placeholder="Note content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || isAtLimit}
          className={`w-full py-2 px-4 rounded-md font-medium ${
            isAtLimit
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {loading ? 'Creating...' : isAtLimit ? 'Note Limit Reached' : 'Create Note'}
        </button>
      </form>
    </div>
  );
}
