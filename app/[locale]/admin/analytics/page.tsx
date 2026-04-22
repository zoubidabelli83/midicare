// app/[locale]/admin/analytics/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Users, UserCheck, UserX, FileText, FileCheck, Send, 
  Ban, CheckCircle, Loader2, AlertCircle, Trash2 
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const t = useTranslations('admin');
  const tActions = useTranslations('actions');
  const locale = useLocale();
  
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/admin/analytics');
      const data = await res.json();
      
      if (res.ok && data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUserAction = async (userId: string, action: 'BAN' | 'ACTIVATE' | 'VERIFY') => {
    if (!confirm(
      action === 'BAN' ? (locale === 'ar' ? 'حظر هذا المستخدم؟' : locale === 'fr' ? 'Bannir cet utilisateur ?' : 'Ban this user?') :
      action === 'ACTIVATE' ? (locale === 'ar' ? 'تفعيل هذا المستخدم؟' : locale === 'fr' ? 'Activer cet utilisateur ?' : 'Activate this user?') :
      (locale === 'ar' ? 'التحقق من هذا المستخدم؟' : locale === 'fr' ? 'Vérifier cet utilisateur ?' : 'Verify this user?')
    )) {
      return;
    }

    setActionLoading(userId);
    
    try {
      const res = await fetch('/api/admin/analytics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Refresh data
        fetchData();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            {locale === 'ar' ? 'إعادة المحاولة' : locale === 'fr' ? 'Réessayer' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('analytics')}</h1>
          <p className="text-gray-600 mt-1">
            {locale === 'ar' ? 'نظرة عامة على نشاط المنصة' : 
             locale === 'fr' ? 'Vue d\'ensemble de l\'activité de la plateforme' :
             'Platform activity overview'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Users Stats */}
          <StatCard
            icon={Users}
            label={t('total_users')}
            value={analytics?.users?.total || 0}
            color="blue"
          />
          <StatCard
            icon={UserCheck}
            label={t('verified_users')}
            value={analytics?.users?.verified || 0}
            color="green"
          />
          <StatCard
            icon={UserX}
            label={t('pending_users')}
            value={analytics?.users?.pending || 0}
            color="yellow"
          />
          
          {/* Demands Stats */}
          <StatCard
            icon={FileText}
            label={t('total_demands')}
            value={analytics?.demands?.total || 0}
            color="indigo"
          />
          <StatCard
            icon={FileCheck}
            label={t('open_demands')}
            value={analytics?.demands?.open || 0}
            color="green"
          />
          
          {/* Applications */}
          <StatCard
            icon={Send}
            label={t('total_applications')}
            value={analytics?.applications?.total || 0}
            color="purple"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Recent Users */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{t('recent_activity')} • Users</h3>
            <div className="space-y-3">
              {analytics?.recent?.users?.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-green-500' :
                      user.status === 'BANNED' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      user.status === 'BANNED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status}
                    </span>
                    {user.status !== 'BANNED' && (
                      <button
                        onClick={() => handleUserAction(user.id, 'BAN')}
                        disabled={actionLoading === user.id}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                        title={t('ban_user')}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Ban className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {user.status === 'BANNED' && (
                      <button
                        onClick={() => handleUserAction(user.id, 'ACTIVATE')}
                        disabled={actionLoading === user.id}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition disabled:opacity-50"
                        title={t('activate_user')}
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(!analytics?.recent?.users || analytics.recent.users.length === 0) && (
                <p className="text-gray-500 text-sm text-center py-4">
                  {locale === 'ar' ? 'لا يوجد نشاط حديث' : locale === 'fr' ? 'Aucune activité récente' : 'No recent activity'}
                </p>
              )}
            </div>
          </div>

          {/* Recent Demands */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{t('recent_activity')} • Demands</h3>
            <div className="space-y-3">
              {analytics?.recent?.demands?.map((demand: any) => (
                <div key={demand.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{demand.title}</p>
                    <p className="text-sm text-gray-500">
                      {locale === 'ar' ? 'بواسطة' : locale === 'fr' ? 'par' : 'by'} {demand.seeker?.name}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    demand.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {demand.status}
                  </span>
                </div>
              ))}
              {(!analytics?.recent?.demands || analytics.recent.demands.length === 0) && (
                <p className="text-gray-500 text-sm text-center py-4">
                  {locale === 'ar' ? 'لا توجد طلبات حديثة' : locale === 'fr' ? 'Aucune demande récente' : 'No recent demands'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pending Users Table */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">{t('pending_users')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* This would fetch pending users from API - simplified for demo */}
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {locale === 'ar' ? 'استخدم لوحة التحقق في القائمة الجانبية' : 
                     locale === 'fr' ? 'Utilisez le panneau de vérification dans le menu latéral' :
                     'Use the verification panel in the sidebar'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable Stat Card Component
function StatCard({ icon: Icon, label, value, color }: {
  icon: any;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'indigo' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}