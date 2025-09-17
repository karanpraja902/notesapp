'use client';

import { useState, useEffect, useCallback } from 'react';

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

  const fetchSubscriptionData = useCallback(async () => {
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
    } catch {
      console.error('Error fetching subscription data');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, token]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

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
    } catch {
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
    <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 xl:p-8 hover:shadow-xl transition-shadow duration-200 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white text-lg">💳</span>
          </div>
          <h3 className="text-xl xl:text-2xl font-bold text-gray-900">Subscription Status</h3>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm xl:text-base font-semibold ${
          isFreePlan 
            ? 'bg-gray-100 text-gray-800 border border-gray-200' 
            : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200'
        }`}>
          {isFreePlan ? 'Free Plan' : 'Pro Plan'}
        </span>
      </div>

      {isFreePlan ? (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">Notes Used</span>
              <span className="text-sm font-bold text-gray-900">{noteCount} / {tenant.noteLimit}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  isAtLimit ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {isAtLimit ? 'Limit reached' : `${Math.round(progressPercentage)}% of limit used`}
            </div>
          </div>

          {isAtLimit && (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-red-800">Note Limit Reached</h4>
                  <p className="text-sm text-red-700 mt-1">
                    You&apos;ve reached your limit of {tenant.noteLimit} notes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {userRole === 'admin' ? (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-white text-xl">🚀</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-blue-800">Upgrade to Pro</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Get unlimited notes and advanced features.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:transform-none"
                >
                  {upgrading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Upgrading...
                    </div>
                  ) : (
                    'Upgrade Now'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-semibold text-yellow-800">Contact Admin</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Ask your admin to upgrade to Pro for unlimited notes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <svg className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-semibold text-green-800">Pro Plan Active</h4>
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
