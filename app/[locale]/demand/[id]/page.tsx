// app/[locale]/demand/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LocalizedLink } from '@/lib/navigation';
import { ArrowLeft, MapPin, Phone, Navigation, Clock, User, AlertCircle, Loader2, CheckCircle, X, Star } from 'lucide-react';
import ReviewForm from '@/components/ReviewForm';
import ReviewStars from '@/components/ReviewStars';

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
    email?: string;
    avatarUrl?: string | null;
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
    email: string;
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

interface Session {
  user: {
    id: string;
    role: 'ADMIN' | 'SEEKER' | 'PROVIDER';
  } | null;
}

export default function DemandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('demand');
  const tActions = useTranslations('actions');
  const tReviews = useTranslations('reviews');
  const locale = useLocale();
  
  const [demand, setDemand] = useState<Demand | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewApplication, setReviewApplication] = useState<Application | null>(null);
  const [reviewBeforeAccept, setReviewBeforeAccept] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        setSession(sessionData);

        const res = await fetch(`/api/demand/${params.id}`);
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load demand');
        }
        
        setDemand(data.demand);

        if (sessionData?.user?.role === 'SEEKER' && sessionData.user.id === data.demand.seeker.id) {
          const appsRes = await fetch(`/api/application?demandId=${params.id}`);
          const appsData = await appsRes.json();
          if (appsData.success) {
            setApplications(appsData.applications || []);
          }
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load demand');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const handleApplicationAction = async (applicationId: string, status: 'ACCEPTED' | 'REJECTED') => {
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
        const appsRes = await fetch(`/api/application?demandId=${params.id}`);
        const appsData = await appsRes.json();
        if (appsData.success) {
          setApplications(appsData.applications || []);
        }
      } else {
        setError(data.error || 'Failed to update application');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleWriteReview = (application: Application, beforeAccept = false) => {
    setReviewApplication(application);
    setReviewBeforeAccept(beforeAccept);
    setShowReviewModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !demand) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Demand</h2>
          <p className="text-gray-600 mb-6">{error || 'Demand not found'}</p>
          <LocalizedLink href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
            {locale === 'ar' ? 'العودة للوحة التحكم' : locale === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
          </LocalizedLink>
        </div>
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${demand.lat},${demand.lng}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
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
        
        <div className="mb-8">
          <LocalizedLink href="/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-5 h-5" />
            {locale === 'ar' ? 'العودة للوحة التحكم' : locale === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
          </LocalizedLink>
          <h1 className="text-3xl font-bold text-gray-900">{demand.title}</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32" />
          
          <div className="p-6 -mt-16">
            <div className="flex items-center gap-4 mb-6">
              {demand.seeker.avatarUrl ? (
                <img src={demand.seeker.avatarUrl} alt={demand.seeker.name} className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{demand.seeker.name}</h2>
                <p className="text-gray-600">{demand.seeker.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${demand.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {demand.status === 'OPEN' ? (locale === 'ar' ? 'مفتوح' : locale === 'fr' ? 'Ouvert' : 'Open') : (locale === 'ar' ? 'مغلق' : locale === 'fr' ? 'Fermé' : 'Closed')}
                  </span>
                  {demand._count?.applications !== undefined && (
                    <span className="text-xs text-gray-500">{demand._count.applications} {locale === 'ar' ? 'طلبات' : locale === 'fr' ? 'candidatures' : 'applications'}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{locale === 'ar' ? 'الوصف' : locale === 'fr' ? 'Description' : 'Description'}</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{demand.description}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  {locale === 'ar' ? 'الموقع' : locale === 'fr' ? 'Localisation' : 'Location'}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900 font-mono">{demand.lat.toFixed(6)}, {demand.lng.toFixed(6)}</p>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1 mt-2">
                    <Navigation className="w-4 h-4" />
                    {locale === 'ar' ? 'عرض على الخريطة' : locale === 'fr' ? 'Voir sur la carte' : 'View on map'}
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-600" />
                  {locale === 'ar' ? 'معلومات الاتصال' : locale === 'fr' ? 'Contact' : 'Contact'}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-900">{demand.seeker.phone}</p>
                  <a href={`tel:${demand.seeker.phone}`} className="text-blue-600 hover:underline text-sm inline-flex items-center gap-1 mt-2">
                    <Phone className="w-4 h-4" />
                    {tActions('call_now')}
                  </a>
                </div>
              </div>

              {/* Applications Section */}
              {session?.user?.role === 'SEEKER' && session.user.id === demand.seeker.id && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    {locale === 'ar' ? 'طلبات التقديم' : locale === 'fr' ? 'Candidatures' : 'Applications'} ({applications.length})
                  </h3>
                  
                  {applications.length > 0 ? (
                    <div className="space-y-4">
                      {applications.map((app) => (
                        <div key={app.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {app.provider?.avatarUrl ? (
                              <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-blue-500">
                                <img
                                  src={app.provider.avatarUrl}
                                  alt={app.provider.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/default-avatar.png';
                                  }}
                                />
                              </div>
                              ) : (
                              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600" />
                              </div>
                              )}
                              <div>
                                <h4 className="font-semibold text-gray-900">{app.provider?.name}</h4>
                                <p className="text-sm text-gray-500">{app.provider?.email}</p>
                                {/* ✅ Show Provider Rating */}
                                {app.provider?.averageRating && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <ReviewStars rating={Math.round(app.provider.averageRating)} size="sm" />
                                    <span className="text-xs text-gray-600">{app.provider.averageRating.toFixed(1)} ({app.provider.totalReviews})</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                app.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                                app.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {app.status === 'PENDING' ? (locale === 'ar' ? 'قيد الانتظار' : locale === 'fr' ? 'En attente' : 'Pending') :
                                 app.status === 'ACCEPTED' ? (locale === 'ar' ? 'مقبول' : locale === 'fr' ? 'Accepté' : 'Accepted') :
                                 (locale === 'ar' ? 'مرفوض' : locale === 'fr' ? 'Refusé' : 'Rejected')}
                              </span>
                              {app.review && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                  {app.review.rating}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-gray-700 text-sm mb-3">{app.message}</p>
                          
                          <div className="grid sm:grid-cols-2 gap-3 mb-3">
                            {app.provider?.hourlyRate && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500">{locale === 'ar' ? 'السعر:' : locale === 'fr' ? 'Tarif:' : 'Rate:'}</span>
                                <span className="font-medium text-gray-900">{app.provider.hourlyRate.toLocaleString()} DZD/hour</span>
                              </div>
                            )}
                            {app.provider?.yearsExperience && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-500">{locale === 'ar' ? 'الخبرة:' : locale === 'fr' ? 'Expérience:' : 'Experience:'}</span>
                                <span className="font-medium text-gray-900">{app.provider.yearsExperience} {app.provider.yearsExperience === 1 ? 'year' : 'years'}</span>
                              </div>
                            )}
                          </div>
                          
                          {app.provider?.specialties && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 mb-1">{locale === 'ar' ? 'التخصصات:' : locale === 'fr' ? 'Spécialités:' : 'Specialties:'}</p>
                              <div className="flex flex-wrap gap-1">
                                {app.provider.specialties.split(',').slice(0, 3).map((spec: string, i: number) => (
                                  <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{spec.trim()}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2 flex-wrap">
                            {app.status === 'PENDING' && (
                              <>
                                {/* ✅ Rate Before Accept Button */}
                                <button
                                  onClick={() => handleWriteReview(app, true)}
                                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <Star className="w-4 h-4" />
                                  {locale === 'ar' ? 'تقييم قبل القبول' : locale === 'fr' ? 'Évaluer avant d\'accepter' : 'Rate Before Accept'}
                                </button>
                                <button
                                  onClick={() => handleApplicationAction(app.id, 'ACCEPTED')}
                                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                >
                                  {locale === 'ar' ? 'قبول' : locale === 'fr' ? 'Accepter' : 'Accept'}
                                </button>
                                <button
                                  onClick={() => handleApplicationAction(app.id, 'REJECTED')}
                                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                                >
                                  {locale === 'ar' ? 'رفض' : locale === 'fr' ? 'Refuser' : 'Reject'}
                                </button>
                              </>
                            )}
                            {session?.user?.role === 'SEEKER' && session.user.id === demand.seeker.id && (
                              <button
                                onClick={() => handleWriteReview(app, false)}
                                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <Star className="w-4 h-4" />
                                {locale === 'ar' ? 'كتابة مراجعة' : locale === 'fr' ? 'Écrire un avis' : 'Write Review'}
                              </button>
                            )}
                            {app.provider?.phone && app.status === 'ACCEPTED' && (
                              <a
                                href={`tel:${app.provider.phone}`}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                              >
                                <Phone className="w-4 h-4" />
                                {locale === 'ar' ? 'اتصل' : locale === 'fr' ? 'Appeler' : 'Call'}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      {locale === 'ar' ? 'لا توجد طلبات مقدمة بعد' : locale === 'fr' ? 'Aucune candidature pour le moment' : 'No applications yet'}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(demand.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span>•</span>
                <span>ID: {demand.id}</span>
              </div>
            </div>
          </div>
        </div>

        {showReviewModal && reviewApplication && (
          <ReviewForm
            revieweeId={reviewApplication.provider!.id}
            revieweeName={reviewApplication.provider!.name}
            demandId={demand.id}
            applicationId={reviewApplication.id}
            onSuccess={() => {
              setShowReviewModal(false);
              setReviewApplication(null);
              setSuccessMessage(tReviews('submit_review') + ' - ' + tReviews('success'));
              setTimeout(() => setSuccessMessage(''), 5000);
              const appsRes = fetch(`/api/application?demandId=${params.id}`)
                .then(res => res.json())
                .then(appsData => {
                  if (appsData.success) {
                    setApplications(appsData.applications || []);
                  }
                });
            }}
            onClose={() => {
              setShowReviewModal(false);
              setReviewApplication(null);
            }}
          />
        )}
      </div>
    </div>
  );
}