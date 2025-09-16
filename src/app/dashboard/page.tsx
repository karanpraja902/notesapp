'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CreateNote from '@/components/CreateNote';
import NotesList from '@/components/NotesList';

interface User {
  id: string;
  email: string;
  role: string;
  tenantSlug: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleNoteCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLimitReached = () => {
    setShowUpgrade(true);
  };

  const handleUpgrade = async () => {
    if (!user) return;

    setUpgrading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tenants/${user.tenantSlug}/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setShowUpgrade(false);
        alert('Successfully upgraded to Pro!');
      } else {
        const data = await response.json();
        alert(data.error || 'Upgrade failed');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Notes App</h1>
              <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {user.tenantSlug.toUpperCase()}
              </span>
              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                {user.role.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {showUpgrade && user.role === 'admin' && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            <div className="flex justify-between items-center">
              <span>Note limit reached! Upgrade to Pro for unlimited notes.</span>
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
              >
                {upgrading ? 'Upgrading...' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        )}

        {showUpgrade && user.role !== 'admin' && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
            Note limit reached! Ask your admin to upgrade to Pro for unlimited notes.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <CreateNote 
              onNoteCreated={handleNoteCreated} 
              onLimitReached={handleLimitReached}
            />
          </div>
          <div>
            <NotesList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </div>
  );
}
