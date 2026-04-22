// app/[locale]/dashboard/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LocalizedLink } from '@/lib/navigation';
import DemandCard from '@/components/DemandCard';
import ApplicationModal from '@/components/ApplicationModal';
import ProviderApplicationCard from '@/components/ProviderApplicationCard';
import ReviewStars from '@/components/ReviewStars';
import { 
  Plus, MapPin, Loader2, AlertCircle, CheckCircle, 
  FileText, Users, TrendingUp, Bell, Search, Filter,
  Home, Shield, BarChart3, X, Clock, Navigation, Phone, User, Star
} from 'lucide-react';

interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'SEEKER' | 'PROVIDER';
    isVerified: boolean;
    status: 'PENDING' | 'ACTIVE' | 'BANNED';
    avatarUrl?: string | null;
    phone?: string;
  };
}

interface Demand {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  seeker: {
    id: string;
    name: string;
    phone: string;
    avatarUrl?: string | null;
    lat: number | null;
    lng: number | null;
  };
  _count?: { applications: number };
}

interface Application {
  id: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  review?: {
    id: string;
    rating: number;
  } | null;
  provider?: {
    id: string;
    name: string;
    phone: string;
    avatarUrl?: string | null;
    hourlyRate?: number | null;
    yearsExperience?: number | null;
    specialties?: string | null;
    certifications?: string | null;
    bio?: string | null;
    serviceRadius?: number | null;
    averageRating?: number | null;
    totalReviews?: number;
  };
}

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

interface UserStats {
  averageRating?: number;
  totalReviews?: number;
}

interface PlatformStats {
  totalReviews: number;
  averageRating: number;
  topProviders: Array<{
    id: string;
    name: string;
    averageRating: number | null;
    totalReviews: number;
  }>;
}

interface StatCardProps {
  icon: any;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'indigo' | 'purple';
  locale: string;
}

function StatCard({ icon: Icon, label, value, color, locale }: StatCardProps) {
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

export default function DashboardPage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  const [locale, setLocale] = useState<string>('en');
  const t = useTranslations('dashboard');
  const tErrors = useTranslations('errors');
  const tActions = useTranslations('actions');
  const tNav = useTranslations('nav');
  const tProvider = useTranslations('provider');
  const tAdmin = useTranslations('admin');
  const tReviews = useTranslations('reviews');
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [session, setSession] = useState<Session | null>(null);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reviewsGiven, setReviewsGiven] = useState<Review[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState<{ id: string; title: string } | null>(null);
  
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    params.then(p => setLocale(p.locale));
  }, [params]);

  useEffect(() => {
    const demandPosted = searchParams.get('demandPosted');
    const registered = searchParams.get('registered');
    
    if (demandPosted === 'true') {
      setSuccessMessage(t('demand_posted'));
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
    
    if (registered === 'true') {
      setSuccessMessage(t('registered'));
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, t]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();


      if (!sessionRes.ok || !sessionData || !sessionData.user) {
      console.warn('No valid session, redirecting to login');
      router.push(`/${locale}/login`);
      return;
    }
    setSession(sessionData);  // ✅ Store entire sessionData (includes user)
    const user = sessionData.user;  // ✅ Access user from sessionData.user

      if (user.status === 'BANNED') {
        setError('Your account has been banned. Please contact support.');
        setLoading(false);
        return;
      }

      // Fetch demands based on role
      if (user.role === 'SEEKER') {
        const demandsRes = await fetch(`/api/demand?seekerId=${user.id}`);
        const demandsData = await demandsRes.json();
        if (demandsData.success) setDemands(demandsData.demands || []);
        
        // Fetch reviews given by this seeker
        const reviewsRes = await fetch(`/api/reviews?reviewerId=${user.id}`);
        const reviewsData = await reviewsRes.json();
        if (reviewsData.success) {
          setReviewsGiven(reviewsData.reviews || []);
        }
      } else if (user.role === 'PROVIDER') {
        const demandsRes = await fetch('/api/demand?status=OPEN');
        const demandsData = await demandsRes.json();
        if (demandsData.success) setDemands(demandsData.demands || []);
        
        // Fetch provider's rating stats
        const statsRes = await fetch(`/api/reviews?userId=${user.id}`);
        const statsData = await statsRes.json();
        if (statsData.success) {
          setUserStats({
            averageRating: statsData.averageRating,
            totalReviews: statsData.totalReviews,
          });
        }
      } else if (user.role === 'ADMIN') {
        const demandsRes = await fetch('/api/demand');
        const demandsData = await demandsRes.json();
        if (demandsData.success) setDemands(demandsData.demands || []);
        
        // Fetch platform-wide stats
        const platformRes = await fetch('/api/reviews?platformStats=true');
        const platformData = await platformRes.json();
        if (platformData.success) {
          setPlatformStats(platformData.platformStats);
        }
      }

      // Fetch applications for ALL roles
      if (user.role === 'PROVIDER') {
        const appsRes = await fetch(`/api/application?providerId=${user.id}`);
        const appsData = await appsRes.json();
        if (appsData.success) {
          setApplications(appsData.applications?.map((app: any) => ({
            ...app,
            demand: { ...app.demand, seeker: app.demand?.seeker || { name: 'Unknown', phone: '' } }
          })) || []);
        }
      } else if (user.role === 'SEEKER') {
        const appsRes = await fetch('/api/application');
        const appsData = await appsRes.json();
        if (appsData.success) {
          setApplications(appsData.applications?.map((app: any) => ({
            ...app,
            demand: { ...app.demand, seeker: app.demand?.seeker || { name: 'Unknown', phone: '' } },
            provider: app.provider || { name: 'Unknown', phone: '' }
          })) || []);
        }
      } else if (user.role === 'ADMIN') {
        const appsRes = await fetch('/api/application');
        const appsData = await appsRes.json();
        if (appsData.success) {
          setApplications(appsData.applications?.map((app: any) => ({
            ...app,
            demand: { ...app.demand, seeker: app.demand?.seeker || { name: 'Unknown', phone: '' } },
            provider: app.provider || { name: 'Unknown', phone: '' }
          })) || []);
        }
      }

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(tErrors('network_error'));

    } finally {
      setLoading(false);
    }
  }, [locale, router, tErrors]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyClick = useCallback((demandId: string, title: string) => {
    setSelectedDemand({ id: demandId, title });
    setApplyModalOpen(true);
  }, []);

  const handleApplicationSuccess = useCallback(() => {
    setSuccessMessage('Application sent successfully!');
    setTimeout(() => setSuccessMessage(''), 5000);
    fetchData();
  }, [fetchData]);

  const handleCloseDemand = useCallback(async (demandId: string) => {
    const confirmMsg = locale === 'ar' ? 'هل تريد إغلاق هذا الطلب؟' : locale === 'fr' ? 'Fermer cette demande ?' : 'Close this demand?';
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/demand', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demandId, status: 'CLOSED' }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Demand closed successfully');
        setTimeout(() => setSuccessMessage(''), 5000);
        fetchData();
      } else {
        setError(data.error || 'Failed to close demand');
      }
    } catch (err) {
      setError(tErrors('network_error'));
    }
  }, [locale, fetchData, tErrors]);

  const handleApplicationAction = useCallback(async (applicationId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await fetch('/api/application', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(`Application ${status.toLowerCase()}`);
        setTimeout(() => setSuccessMessage(''), 5000);
        fetchData();
      } else {
        setError(data.error || 'Failed to update application');
      }
    } catch (err) {
      setError(tErrors('network_error'));
    }
  }, [fetchData, tErrors]);

  const filteredDemands = demands.filter(demand => {
    const matchesFilter = filter === 'all' || demand.status.toLowerCase() === filter;
    const matchesSearch = demand.title.toLowerCase().includes(searchQuery.toLowerCase()) || demand.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (session && !session.user.isVerified && session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('pending_verification')}</h1>
          <p className="text-gray-600 mb-6">{t('pending_notice')}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <LocalizedLink href="/" className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition">
              {locale === 'ar' ? 'العودة للرئيسية' : locale === 'fr' ? "Retour à l'accueil" : 'Back to Home'}
            </LocalizedLink>
            <button onClick={() => fetchData()} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
              {locale === 'ar' ? 'إعادة التحقق' : locale === 'fr' ? 'Vérifier à nouveau' : 'Check Status'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600 font-medium">{locale === 'ar' ? 'جاري التحميل...' : locale === 'fr' ? 'Chargement...' : 'Loading...'}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (session.user.status === 'BANNED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Banned</h1>
          <p className="text-gray-600 mb-6">Your account has been suspended. Please contact support.</p>
          <button onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push(`/${locale}/login`); }} className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition">
            {tNav('logout')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {successMessage && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-md animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {session.user.role === 'PROVIDER' ? tProvider('dashboard_title') : t('welcome', { name: session.user.name || session.user.email.split('@')[0] })}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                session.user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                session.user.role === 'SEEKER' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {session.user.role === 'ADMIN' ? 'Admin' : session.user.role === 'SEEKER' ? (locale === 'ar' ? 'باحث عن رعاية' : locale === 'fr' ? 'Demandeur de soins' : 'Care Seeker') : (locale === 'ar' ? 'مقدم رعاية' : locale === 'fr' ? 'Prestataire de soins' : 'Care Provider')}
              </span>
              {session.user.isVerified && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {locale === 'ar' ? 'مُتحقق' : locale === 'fr' ? 'Vérifié' : 'Verified'}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <LocalizedLink href="/profile" className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
              <Users className="w-4 h-4" />
              {locale === 'ar' ? 'الملف الشخصي' : locale === 'fr' ? 'Profil' : 'Profile'}
            </LocalizedLink>
            {session.user.role === 'SEEKER' && (
              <LocalizedLink href="/demand/new" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm hover:shadow">
                <Plus className="w-4 h-4" />
                {t('post_demand')}
              </LocalizedLink>
            )}
            {session.user.role === 'ADMIN' && (
              <>
                <LocalizedLink href="/admin" className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition shadow-sm hover:shadow">
                  <Shield className="w-4 h-4" />
                  {tNav('adminPanel')}
                </LocalizedLink>
                <LocalizedLink href="/admin/analytics" className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm hover:shadow">
                  <BarChart3 className="w-4 h-4" />
                  {tNav('analytics')}
                </LocalizedLink>
              </>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {session.user.role === 'ADMIN' ? (
            <>
              <StatCard icon={FileText} label={locale === 'ar' ? 'إجمالي الطلبات' : locale === 'fr' ? 'Total des demandes' : 'Total Demands'} value={demands.length} color="blue" locale={locale} />
              <StatCard icon={TrendingUp} label={locale === 'ar' ? 'طلبات مفتوحة' : locale === 'fr' ? 'Demandes ouvertes' : 'Open Demands'} value={demands.filter(d => d.status === 'OPEN').length} color="green" locale={locale} />
              <StatCard icon={Users} label={locale === 'ar' ? 'إجمالي الطلبات المقدمة' : locale === 'fr' ? 'Total des candidatures' : 'Total Applications'} value={applications.length} color="purple" locale={locale} />
              <StatCard icon={CheckCircle} label={locale === 'ar' ? 'المقبولة' : locale === 'fr' ? 'Acceptées' : 'Accepted'} value={applications.filter(a => a.status === 'ACCEPTED').length} color="indigo" locale={locale} />
            </>
          ) : (
            <>
              <StatCard icon={FileText} label={session.user.role === 'SEEKER' ? t('my_demands') : tProvider('available_demands')} value={demands.length} color="blue" locale={locale} />
              <StatCard icon={TrendingUp} label={locale === 'ar' ? 'طلبات مفتوحة' : locale === 'fr' ? 'Demandes ouvertes' : 'Open Demands'} value={demands.filter(d => d.status === 'OPEN').length} color="green" locale={locale} />
              <StatCard icon={Users} label={session.user.role === 'PROVIDER' ? tProvider('my_applications') : t('my_applications')} value={applications.length} color="purple" locale={locale} />
              <StatCard icon={CheckCircle} label={locale === 'ar' ? 'مقبولة' : locale === 'fr' ? 'Acceptées' : 'Accepted'} value={applications.filter(a => a.status === 'ACCEPTED').length} color="indigo" locale={locale} />
            </>
          )}
        </div>

        {/* ✅ Ratings Summary Section - Shows for all roles */}
        {session.user.role === 'PROVIDER' && userStats && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              {locale === 'ar' ? 'تقييماتي' : locale === 'fr' ? 'Mes évaluations' : 'My Ratings'}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{userStats.averageRating?.toFixed(1) || '0.0'}</p>
                <ReviewStars rating={Math.round(userStats.averageRating || 0)} size="md" />
                <p className="text-sm text-gray-600 mt-2">{locale === 'ar' ? 'متوسط التقييم' : locale === 'fr' ? 'Note moyenne' : 'Average Rating'}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{userStats.totalReviews || 0}</p>
                <p className="text-sm text-gray-600 mt-2">{locale === 'ar' ? 'عدد التقييمات' : locale === 'fr' ? 'Total des avis' : 'Total Reviews'}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{applications.filter(a => a.status === 'ACCEPTED').length}</p>
                <p className="text-sm text-gray-600 mt-2">{locale === 'ar' ? 'الطلبات المقبولة' : locale === 'fr' ? 'Candidatures acceptées' : 'Accepted Jobs'}</p>
              </div>
            </div>
          </section>
        )}

        {session.user.role === 'SEEKER' && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              {locale === 'ar' ? 'تقييماتي لمقدمي الخدمة' : locale === 'fr' ? 'Mes évaluations des prestataires' : 'My Provider Ratings'}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{reviewsGiven.length}</p>
                <p className="text-sm text-gray-600 mt-2">{locale === 'ar' ? 'التقييمات المقدمة' : locale === 'fr' ? 'Avis donnés' : 'Reviews Given'}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{demands.length}</p>
                <p className="text-sm text-gray-600 mt-2">{locale === 'ar' ? 'الطلبات المنشورة' : locale === 'fr' ? 'Demandes publiées' : 'Demands Posted'}</p>
              </div>
            </div>
          </section>
        )}

        {session.user.role === 'ADMIN' && platformStats && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              {locale === 'ar' ? 'نظرة عامة على التقييمات' : locale === 'fr' ? 'Aperçu des évaluations' : 'Ratings Overview'}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{platformStats.totalReviews}</p>
                <p className="text-sm text-gray-600 mt-2">{locale === 'ar' ? 'إجمالي التقييمات' : locale === 'fr' ? 'Total des avis' : 'Total Reviews'}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{platformStats.averageRating.toFixed(1)}</p>
                <p className="text-sm text-gray-600 mt-2">{locale === 'ar' ? 'متوسط التقييم' : locale === 'fr' ? 'Note moyenne' : 'Platform Average'}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{platformStats.topProviders.length}</p>
                <p className="text-sm text-gray-600 mt-2">{locale === 'ar' ? 'أفضل المقدمين' : locale === 'fr' ? 'Meilleurs prestataires' : 'Top Providers'}</p>
              </div>
            </div>
            
            {/* Top Providers List */}
            {platformStats.topProviders.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">{locale === 'ar' ? 'أفضل المقدمين تقييماً' : locale === 'fr' ? 'Meilleurs prestataires' : 'Top Rated Providers'}</h3>
                <div className="space-y-2">
                  {platformStats.topProviders.map((provider, index) => (
                    <div key={provider.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                        <span className="font-medium text-gray-900">{provider.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ReviewStars rating={Math.round(provider.averageRating || 0)} size="sm" />
                        <span className="text-sm font-medium text-gray-900">{provider.averageRating?.toFixed(1)}</span>
                        <span className="text-xs text-gray-500">({provider.totalReviews})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Demands Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {session.user.role === 'SEEKER' ? t('my_demands') : session.user.role === 'PROVIDER' ? (locale === 'ar' ? 'الطلبات المتاحة' : locale === 'fr' ? 'Demandes disponibles' : 'Available Demands') : (locale === 'ar' ? 'جميع الطلبات' : locale === 'fr' ? 'Toutes les demandes' : 'All Demands')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder={locale === 'ar' ? 'بحث...' : locale === 'fr' ? 'Rechercher...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option value="all">{locale === 'ar' ? 'الكل' : locale === 'fr' ? 'Tous' : 'All'}</option>
                    <option value="open">{t('status_open')}</option>
                    <option value="closed">{t('status_closed')}</option>
                  </select>
                </div>
              </div>
              {filteredDemands.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">{searchQuery ? (locale === 'ar' ? 'لا توجد نتائج للبحث' : locale === 'fr' ? 'Aucun résultat trouvé' : 'No results found') : session.user.role === 'SEEKER' ? t('no_demands') : tProvider('no_demands')}</p>
                  {session.user.role === 'SEEKER' && !searchQuery && (
                    <LocalizedLink href="/demand/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
                      <Plus className="w-4 h-4" />
                      {t('post_demand')}
                    </LocalizedLink>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDemands.map((demand) => (
                    <div key={demand.id} id={`demand-${demand.id}`}>
                      <DemandCard demand={demand} showActions={true} onApply={session.user.role === 'PROVIDER' ? handleApplyClick : undefined} onClose={session.user.role === 'SEEKER' ? handleCloseDemand : undefined} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Applications for SEEKER */}
            {session.user.role === 'SEEKER' && applications.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">{locale === 'ar' ? 'طلبات التقديم' : locale === 'fr' ? 'Candidatures reçues' : 'Applications Received'}</h2>
                <div className="space-y-4">
                  {applications.map((app: any) => (
                    <div key={app.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {app.provider?.avatarUrl ? (
                              <img src={app.provider.avatarUrl} alt={app.provider.name} className="w-10 h-10 rounded-full object-cover border-2 border-blue-500" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                              </div>
                            )}
                            <div>
                              <h4 className="font-semibold text-gray-900">{app.provider?.name}</h4>
                              <p className="text-sm text-gray-500">{app.demand?.title}</p>
                              {/* Show Provider Rating */}
                              {app.provider?.averageRating && (
                                <div className="flex items-center gap-1 mt-1">
                                  <ReviewStars rating={Math.round(app.provider.averageRating)} size="sm" />
                                  <span className="text-xs text-gray-600">{app.provider.averageRating.toFixed(1)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{app.message}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>📞 {app.provider?.phone}</span>
                            <span>•</span>
                            <span>{new Date(app.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US')}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            app.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                            app.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {app.status === 'PENDING' ? t('status_pending') : app.status === 'ACCEPTED' ? t('status_accepted') : t('status_closed')}
                          </span>
                          {app.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <button onClick={() => handleApplicationAction(app.id, 'ACCEPTED')} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition" title={tActions('accept_application')}><CheckCircle className="w-4 h-4" /></button>
                              <button onClick={() => handleApplicationAction(app.id, 'REJECTED')} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition" title={tActions('reject_application')}><X className="w-4 h-4" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Applications for PROVIDER */}
            {session.user.role === 'PROVIDER' && applications.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">{tProvider('my_applications')}</h2>
                <div className="space-y-4">
                  {applications.map((app: any) => (
                    <ProviderApplicationCard
                      key={app.id}
                      application={{
                        ...app,
                        demand: {
                          ...app.demand,
                          seeker: app.demand?.seeker || { name: 'Unknown', phone: '' }
                        }
                      }}
                      locale={locale}
                      onViewDemand={() => {
                        router.push(`/${locale}/demand/${app.demand?.id}`);
                      }}
                      onContactSeeker={() => {
                        if (app.demand?.seeker?.phone) {
                          window.location.href = `tel:${app.demand.seeker.phone}`;
                        }
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Applications for ADMIN */}
            {session.user.role === 'ADMIN' && applications.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{tAdmin('all_applications')}</h2>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">{applications.length} {locale === 'ar' ? 'طلب' : locale === 'fr' ? 'candidatures' : 'applications'}</span>
                </div>
                <div className="space-y-4">
                  {applications.map((app: any) => (
                    <div key={app.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {app.provider?.avatarUrl ? (<img src={app.provider.avatarUrl} alt={app.provider.name} className="w-10 h-10 rounded-full object-cover border-2 border-blue-500" />) : (<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>)}
                              <div>
                                <h4 className="font-semibold text-gray-900">{app.provider?.name}</h4>
                                <p className="text-sm text-gray-500">{locale === 'ar' ? 'مقدم إلى' : locale === 'fr' ? 'Postulé à' : 'Applied to'}: {app.demand?.title}</p>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${app.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : app.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {app.status === 'PENDING' ? t('status_pending') : app.status === 'ACCEPTED' ? t('status_accepted') : t('status_closed')}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-3 line-clamp-2">{app.message}</p>
                          <div className="flex items-center gap-3 mb-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              {app.demand?.seeker?.avatarUrl ? (<img src={app.demand.seeker.avatarUrl} alt={app.demand.seeker.name} className="w-8 h-8 rounded-full object-cover" />) : (<div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><User className="w-4 h-4 text-green-600" /></div>)}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{app.demand?.seeker?.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-500">{app.demand?.seeker?.email}</p>
                              </div>
                            </div>
                            {app.demand?.seeker?.phone && (<a href={`tel:${app.demand.seeker.phone}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />{app.demand.seeker.phone}</a>)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(app.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US')}</span>
                            <span>•</span>
                            <span>{app.demand?.status === 'OPEN' ? t('status_open') : t('status_closed')}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[180px]">
                          <LocalizedLink
                            href={`/demand/${app.demand?.id}`}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                          >
                            <Navigation className="w-4 h-4" />
                            {locale === 'ar' ? 'عرض طلب الباحث' : locale === 'fr' ? 'Voir la demande' : 'View Seeker Demand'}
                          </LocalizedLink>
                          <LocalizedLink
                            href={`/profile/${app.provider?.id}`}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-sm font-medium"
                          >
                            <Users className="w-4 h-4" />
                            {locale === 'ar' ? 'عرض ملف المقدم' : locale === 'fr' ? 'Voir le profil du prestataire' : 'View Provider Profile'}
                          </LocalizedLink>
                          {app.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <button onClick={() => handleApplicationAction(app.id, 'ACCEPTED')} className="flex-1 p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium">{locale === 'ar' ? 'قبول' : locale === 'fr' ? 'Accepter' : 'Accept'}</button>
                              <button onClick={() => handleApplicationAction(app.id, 'REJECTED')} className="flex-1 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium">{locale === 'ar' ? 'رفض' : locale === 'fr' ? 'Refuser' : 'Reject'}</button>
                            </div>
                          )}
                          {app.status === 'ACCEPTED' && app.demand?.seeker?.phone && (
                            <a href={`tel:${app.demand.seeker.phone}`} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium">
                              <Phone className="w-4 h-4" />
                              {tActions('call_now')}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{locale === 'ar' ? 'إجراءات سريعة' : locale === 'fr' ? 'Actions rapides' : 'Quick Actions'}</h3>
              <div className="space-y-2">
                {session.user.role === 'SEEKER' && (<LocalizedLink href="/demand/new" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition font-medium"><Plus className="w-5 h-5" />{t('post_demand')}</LocalizedLink>)}
                {session.user.role === 'PROVIDER' && (<LocalizedLink href="/profile" className="flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium"><Users className="w-5 h-5" />{locale === 'ar' ? 'تحديث الملف الشخصي' : locale === 'fr' ? 'Mettre à jour le profil' : 'Update Profile'}</LocalizedLink>)}
                <LocalizedLink href="/" className="flex items-center gap-3 px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"><Home className="w-5 h-5" />{locale === 'ar' ? 'الصفحة الرئيسية' : locale === 'fr' ? 'Accueil' : 'Home'}</LocalizedLink>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-3"><Bell className="w-5 h-5" /><h4 className="font-semibold">{locale === 'ar' ? 'نصيحة' : locale === 'fr' ? 'Conseil' : 'Tip'}</h4></div>
              <p className="text-sm text-blue-100">
                {session.user.role === 'SEEKER' ? (locale === 'ar' ? 'أضف تفاصيل دقيقة لطلبك لجذب مقدمي خدمات أفضل' : locale === 'fr' ? 'Ajoutez des détails précis à votre demande pour attirer les meilleurs prestataires' : 'Add specific details to your demand to attract better providers')
                : session.user.role === 'PROVIDER' ? (locale === 'ar' ? 'اكتب رسالة شخصية عند التقديم لزيادة فرصك' : locale === 'fr' ? 'Écrivez un message personnalisé pour augmenter vos chances' : 'Write a personalized message when applying to increase your chances')
                : (locale === 'ar' ? 'راجع المستخدمين المعلقين بانتظام' : locale === 'fr' ? 'Vérifiez régulièrement les utilisateurs en attente' : 'Review pending users regularly')}
              </p>
            </div>
          </aside>
        </div>

        {selectedDemand && (
          <ApplicationModal demandId={selectedDemand.id} demandTitle={selectedDemand.title} isOpen={applyModalOpen} onClose={() => { setApplyModalOpen(false); setSelectedDemand(null); }} onSuccess={handleApplicationSuccess} />
        )}
      </div>
    </div>
  );
}