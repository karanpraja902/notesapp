'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import CreateNote from '@/components/CreateNote';
import NotesList from '@/components/NotesList';
import UserManagement from '@/components/UserManagement';
import SubscriptionStatus from '@/components/SubscriptionStatus';

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
  const [activeTab, setActiveTab] = useState<'notes' | 'users' | 'subscription' | 'overview'>('overview');
  const [subscriptionData, setSubscriptionData] = useState<{
    noteCount: number;
    noteLimit: number;
    isProPlan: boolean;
  }>({ noteCount: 0, noteLimit: 3, isProPlan: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    fetchSubscriptionData();
  };

  const fetchSubscriptionData = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const tenantResponse = await fetch(`/api/tenants/${user.tenantSlug}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const notesResponse = await fetch('/api/notes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (tenantResponse.ok && notesResponse.ok) {
        const tenantData = await tenantResponse.json();
        const notesData = await notesResponse.json();
        
        setSubscriptionData({
          noteCount: notesData.notes.length,
          noteLimit: tenantData.tenant.noteLimit,
          isProPlan: tenantData.tenant.plan === 'pro'
        });
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user, fetchSubscriptionData]);

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
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Upgrade failed');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  const handleSubscriptionUpgrade = () => {
    setShowUpgrade(false);
    setRefreshTrigger(prev => prev + 1);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const navigation = [
    { name: 'Overview', id: 'overview', icon: '📊' },
    { name: 'Notes', id: 'notes', icon: '📝' },
    { name: 'Subscription', id: 'subscription', icon: '💳' },
    ...(user.role === 'admin' ? [{ name: 'Users', id: 'users', icon: '👥' }] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className='flex'>
      <div className={` fixed inset-y-0 left-0 z-50 w-64 xl:w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-center h-16 px-4 bg-gradient-to-r from-blue-600 to-indigo-600">
          <h1 className="text-xl xl:text-2xl font-bold text-white">Notes App</h1>
        </div>
        
        <div className="px-4 py-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm xl:text-base">
                {user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm xl:text-base font-medium text-gray-900 truncate">{user.email}</p>
              <div className="flex space-x-2 mt-1">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs xl:text-sm font-medium bg-blue-100 text-blue-800">
                  {user.tenantSlug.toUpperCase()}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs xl:text-sm font-medium bg-gray-100 text-gray-800">
                  {user.role.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as 'notes' | 'users' | 'subscription' | 'overview');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 xl:py-3 text-sm xl:text-base font-medium rounded-lg transition-colors duration-200 ${
                  activeTab === item.id
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-lg xl:text-xl">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
          >
            <span className="mr-2">🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className={` `}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-4">
                <h2 className="text-xl xl:text-2xl font-semibold text-gray-900 capitalize">
                  {activeTab}
                </h2>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden sm:block text-sm xl:text-base text-gray-600">
                  Welcome back, {user.email.split('@')[0]}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content area */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Upgrade notification */}
          {showUpgrade && user.role === 'admin' && (
            <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-800">
                      Note limit reached! Upgrade to Pro for unlimited notes.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 transition-all duration-200"
                >
                  {upgrading ? 'Upgrading...' : 'Upgrade to Pro'}
                </button>
              </div>
            </div>
          )}

          {showUpgrade && user.role !== 'admin' && (
            <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">
                    Note limit reached! Ask your admin to upgrade to Pro for unlimited notes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-lg">📝</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Notes</p>
                      <p className="text-2xl font-bold text-gray-900">{subscriptionData.noteCount}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 text-lg">💳</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Plan</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {subscriptionData.isProPlan ? 'Pro' : 'Free'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 text-lg">📊</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Usage</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {subscriptionData.isProPlan ? '∞' : `${subscriptionData.noteCount}/${subscriptionData.noteLimit}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 text-lg">👤</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Role</p>
                      <p className="text-2xl font-bold text-gray-900 capitalize">{user.role}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  <button
                    onClick={() => setActiveTab('notes')}
                    className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                  >
                    <span className="text-2xl mr-3">📝</span>
                    <div className="text-left">
                      <p className="font-medium text-blue-900">Create Note</p>
                      <p className="text-sm text-blue-600">Add a new note</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('subscription')}
                    className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
                  >
                    <span className="text-2xl mr-3">💳</span>
                    <div className="text-left">
                      <p className="font-medium text-green-900">Subscription</p>
                      <p className="text-sm text-green-600">Manage your plan</p>
                    </div>
                  </button>

                  {user.role === 'admin' && (
                    <button
                      onClick={() => setActiveTab('users')}
                      className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200"
                    >
                      <span className="text-2xl mr-3">👥</span>
                      <div className="text-left">
                        <p className="font-medium text-purple-900">Users</p>
                        <p className="text-sm text-purple-600">Manage team</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Recent Notes Preview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Notes</h3>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View all →
                  </button>
                </div>
                <NotesList refreshTrigger={refreshTrigger} />
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
              <div className="lg:col-span-1 xl:col-span-1 2xl:col-span-1">
                <CreateNote 
                  onNoteCreated={handleNoteCreated} 
                  onLimitReached={handleLimitReached}
                  currentNoteCount={subscriptionData.noteCount}
                  noteLimit={subscriptionData.noteLimit}
                  isProPlan={subscriptionData.isProPlan}
                />
              </div>
              <div className="lg:col-span-1 xl:col-span-2 2xl:col-span-3">
                <NotesList refreshTrigger={refreshTrigger} />
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="max-w-4xl mx-auto">
              <SubscriptionStatus 
                token={localStorage.getItem('token') || ''} 
                userRole={user.role}
                tenantSlug={user.tenantSlug}
                onUpgrade={handleSubscriptionUpgrade}
              />
            </div>
          )}

          {activeTab === 'users' && user.role === 'admin' && (
            <UserManagement token={localStorage.getItem('token') || ''} />
          )}
        </main>
      </div>
      </div>
    </div>
  );
}