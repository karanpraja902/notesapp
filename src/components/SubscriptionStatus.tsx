'use client';

import { useState, useEffect } from 'react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
  noteLimit: number;
}

interface SubscriptionStatusProps {
  token: string;
  userRole: string;
  tenantSlug: string;
  onUpgrade?: () => void;
}

export default function SubscriptionStatus({ token, userRole, tenantSlug, onUpgrade }: SubscriptionStatusProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [noteCount, setNoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Fetch tenant info
      const tenantResponse = await fetch(`/api/tenants/${tenantSlug}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        setTenant(tenantData.tenant);
      }

      // Fetch user's note count
      const notesResponse = await fetch('/api/notes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (notesResponse.ok) {
        const notesData = await notesResponse.json();
        setNoteCount(notesData.notes.length);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!tenant || userRole !== 'admin') return;

    setUpgrading(true);
    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/upgrade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTenant(data.tenant);
        if (onUpgrade) {
          onUpgrade();
        }
        alert('Successfully upgraded to Pro!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Upgrade failed');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  const isFreePlan = tenant.plan === 'free';
  const isAtLimit = isFreePlan && noteCount >= tenant.noteLimit;
  const progressPercentage = isFreePlan ? (noteCount / tenant.noteLimit) * 100 : 0;

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Subscription Status</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          isFreePlan 
            ? 'bg-gray-100 text-gray-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {isFreePlan ? 'Free Plan' : 'Pro Plan'}
        </span>
      </div>

      {isFreePlan ? (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Notes Used</span>
              <span>{noteCount} / {tenant.noteLimit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isAtLimit ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {isAtLimit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">Note Limit Reached</h4>
                  <p className="text-sm text-red-700 mt-1">
                    You've reached your limit of {tenant.noteLimit} notes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {userRole === 'admin' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Upgrade to Pro</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Get unlimited notes and advanced features.
                  </p>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {upgrading ? 'Upgrading...' : 'Upgrade Now'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Contact Admin</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Ask your admin to upgrade to Pro for unlimited notes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">Pro Plan Active</h4>
              <p className="text-sm text-green-700 mt-1">
                You have unlimited notes and access to all features.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
