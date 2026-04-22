// components/AdminDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { CheckCircle, XCircle, AlertCircle, Loader2, Shield, User, Mail, Phone, Star } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'SEEKER' | 'PROVIDER';
  isVerified: boolean;
  status: 'PENDING' | 'ACTIVE' | 'BANNED';
  avatarUrl?: string | null;
  createdAt: string;
  hourlyRate?: number | null;
  yearsExperience?: number | null;
  specialties?: string | null;
  certifications?: string | null;
  bio?: string | null;
  serviceRadius?: number | null;
  averageRating?: number | null;
  totalReviews?: number;
}

export default function AdminDashboard() {
  const t = useTranslations('admin');
  const locale = useLocale();
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'banned'>('all');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch users');
      }
      
      // ✅ Ensure users is always an array
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

const handleAction = async (userId: string, action: 'verify' | 'ban' | 'unban' | 'activate') => {
  try {
    setError('');
    setSuccess('');
    
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        action 
      }),
    });
    
    const data = await res.json();
    
    if (res.ok && data.success) {
      setSuccess(data.message);
      setTimeout(() => setSuccess(''), 3000);
      fetchUsers(); // ✅ Refresh the user list
    } else {
      setError(data.error || 'Action failed');
    }
  } catch (err) {
    console.error('Admin action error:', err);
    setError('Network error');
  }
};

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    if (filter === 'pending') return user.status === 'PENDING' && !user.isVerified;
    if (filter === 'verified') return user.isVerified && user.status === 'ACTIVE';
    if (filter === 'banned') return user.status === 'BANNED';
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">
          {locale === 'ar' ? 'جاري التحميل...' : locale === 'fr' ? 'Chargement...' : 'Loading...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button onClick={fetchUsers} className="mt-3 text-sm text-red-600 hover:underline">
          {locale === 'ar' ? 'إعادة المحاولة' : locale === 'fr' ? 'Réessayer' : 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('manage_users')}</h2>
          <p className="text-gray-600">{t('manage_users_desc')}</p>
        </div>
        
        <div className="flex gap-2">
          {[
            { value: 'all', label: locale === 'ar' ? 'الكل' : locale === 'fr' ? 'Tous' : 'All' },
            { value: 'pending', label: locale === 'ar' ? 'قيد الانتظار' : locale === 'fr' ? 'En attente' : 'Pending' },
            { value: 'verified', label: locale === 'ar' ? 'مُتحقق' : locale === 'fr' ? 'Vérifiés' : 'Verified' },
            { value: 'banned', label: locale === 'ar' ? 'محظور' : locale === 'fr' ? 'Bannis' : 'Banned' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">{locale === 'ar' ? 'إجمالي المستخدمين' : locale === 'fr' ? 'Total utilisateurs' : 'Total Users'}</p>
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">{locale === 'ar' ? 'قيد الانتظار' : locale === 'fr' ? 'En attente' : 'Pending'}</p>
          <p className="text-2xl font-bold text-yellow-600">
            {users.filter(u => u.status === 'PENDING' && !u.isVerified).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">{locale === 'ar' ? 'مُتحقق' : locale === 'fr' ? 'Vérifiés' : 'Verified'}</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.isVerified && u.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">{locale === 'ar' ? 'محظور' : locale === 'fr' ? 'Bannis' : 'Banned'}</p>
          <p className="text-2xl font-bold text-red-600">
            {users.filter(u => u.status === 'BANNED').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {locale === 'ar' ? 'المستخدم' : locale === 'fr' ? 'Utilisateur' : 'User'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {locale === 'ar' ? 'الدور' : locale === 'fr' ? 'Rôle' : 'Role'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {locale === 'ar' ? 'الحالة' : locale === 'fr' ? 'Statut' : 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {locale === 'ar' ? 'التحقق' : locale === 'fr' ? 'Vérification' : 'Verified'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {locale === 'ar' ? 'تاريخ الإنشاء' : locale === 'fr' ? 'Créé le' : 'Created'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {locale === 'ar' ? 'الإجراءات' : locale === 'fr' ? 'Actions' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {locale === 'ar' ? 'لا توجد مستخدمين' : locale === 'fr' ? 'Aucun utilisateur' : 'No users found'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === 'PROVIDER' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'PROVIDER'
                          ? (locale === 'ar' ? 'مقدم رعاية' : locale === 'fr' ? 'Prestataire' : 'Provider')
                          : (locale === 'ar' ? 'باحث عن رعاية' : locale === 'fr' ? 'Demandeur' : 'Seeker')}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        user.status === 'BANNED' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.status === 'ACTIVE' ? (locale === 'ar' ? 'نشط' : locale === 'fr' ? 'Actif' : 'Active') :
                         user.status === 'BANNED' ? (locale === 'ar' ? 'محظور' : locale === 'fr' ? 'Banni' : 'Banned') :
                         (locale === 'ar' ? 'قيد الانتظار' : locale === 'fr' ? 'En attente' : 'Pending')}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isVerified ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          {locale === 'ar' ? 'نعم' : locale === 'fr' ? 'Oui' : 'Yes'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          {locale === 'ar' ? 'لا' : locale === 'fr' ? 'Non' : 'No'}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!user.isVerified && user.status !== 'BANNED' && (
                          <button
                            onClick={() => handleAction(user.id, 'verify')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title={locale === 'ar' ? 'تحقق من المستخدم' : locale === 'fr' ? 'Vérifier l\'utilisateur' : 'Verify User'}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {user.status !== 'BANNED' && user.status !== 'PENDING' && (
                          <button
                            onClick={() => handleAction(user.id, 'ban')}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title={locale === 'ar' ? 'حظر المستخدم' : locale === 'fr' ? 'Bannir l\'utilisateur' : 'Ban User'}
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                        {user.status === 'BANNED' && (
                          <button
                            onClick={() => handleAction(user.id, 'activate')}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title={locale === 'ar' ? 'تفعيل المستخدم' : locale === 'fr' ? 'Activer l\'utilisateur' : 'Activate User'}
                          >
                            <Shield className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}