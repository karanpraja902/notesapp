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
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isAtLimit = !isProPlan && currentNoteCount >= noteLimit;

  return (
    <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 xl:p-8 hover:shadow-xl transition-shadow duration-200 max-w-md xl:max-w-lg">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white text-lg">📝</span>
          </div>
          <h2 className="text-xl xl:text-2xl font-bold text-gray-900">Create New Note</h2>
        </div>
        {!isProPlan && (
          <div className="flex items-center space-x-2">
            <div className="text-sm xl:text-base text-gray-600 font-medium">
              {currentNoteCount} / {noteLimit} notes
            </div>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isAtLimit ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((currentNoteCount / noteLimit) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label className="block text-sm xl:text-base font-medium text-gray-700">Title</label>
          <input
            type="text"
            placeholder="Enter note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 xl:py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm xl:text-base"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm xl:text-base font-medium text-gray-700">Content</label>
          <textarea
            placeholder="Write your note content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 xl:py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-sm xl:text-base"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || isAtLimit}
          className={`w-full py-3 xl:py-4 px-4 rounded-lg font-semibold text-white transition-all duration-200 text-sm xl:text-base ${
            isAtLimit
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] active:scale-[0.98]'
          } disabled:opacity-50 disabled:transform-none`}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </div>
          ) : isAtLimit ? (
            <div className="flex items-center justify-center">
              <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
              Note Limit Reached
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Note
            </div>
          )}
        </button>
      </form>
    </div>
  );
}
