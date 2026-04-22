// app/[locale]/profile/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LocalizedLink } from '@/lib/navigation';
import { ArrowLeft, User, Mail, Phone, MapPin, Shield, CheckCircle, AlertCircle, Loader2, Briefcase, MapPin as MapPinIcon, Star } from 'lucide-react';
import ReviewStars from '@/components/ReviewStars';
import ReviewCard from '@/components/ReviewCard';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'SEEKER' | 'PROVIDER';
  isVerified: boolean;
  status: 'PENDING' | 'ACTIVE' | 'BANNED';
  avatarUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  hourlyRate?: number | null;
  yearsExperience?: number | null;
  specialties?: string | null;
  certifications?: string | null;
  bio?: string | null;
  serviceRadius?: number | null;
  averageRating?: number | null;
  totalReviews?: number;
  createdAt: string;
}

interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    role: string;
  };
  demand?: {
    id: string;
    title: string;
  } | null;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('profile');
  const tProvider = useTranslations('provider');
  const tReviews = useTranslations('reviews');
  const locale = useLocale();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile
        const res = await fetch(`/api/profile/${params.id}`);
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load profile');
        }
        
        setUser(data.user);

        // Fetch reviews for this user
        const reviewsRes = await fetch(`/api/reviews?userId=${params.id}`);
        const reviewsData = await reviewsRes.json();
        if (reviewsData.success) {
          setReviews(reviewsData.reviews || []);
          setAverageRating(reviewsData.averageRating || 0);
          setTotalReviews(reviewsData.totalReviews || 0);
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-6">{error || 'Profile not found'}</p>
          <LocalizedLink href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
            {locale === 'ar' ? 'العودة للوحة التحكم' : locale === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
          </LocalizedLink>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, Record<string, string>> = {
    en: { ADMIN: 'Administrator', SEEKER: 'Care Seeker', PROVIDER: 'Care Provider' },
    fr: { ADMIN: 'Administrateur', SEEKER: 'Demandeur de soins', PROVIDER: 'Prestataire de soins' },
    ar: { ADMIN: 'مدير النظام', SEEKER: 'باحث عن رعاية', PROVIDER: 'مقدم رعاية' },
  };
  const roleLabel = roleLabels[locale]?.[user.role] || user.role;

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    BANNED: 'bg-red-100 text-red-800',
  };
  const statusLabel = user.status === 'PENDING' 
    ? (locale === 'ar' ? 'قيد الانتظار' : locale === 'fr' ? 'En attente' : 'Pending')
    : user.status === 'ACTIVE'
      ? (locale === 'ar' ? 'نشط' : locale === 'fr' ? 'Actif' : 'Active')
      : (locale === 'ar' ? 'محظور' : locale === 'fr' ? 'Banni' : 'Banned');

  const mapsUrl = user.lat && user.lng 
    ? `https://www.google.com/maps/search/?api=1&query=${user.lat},${user.lng}` 
    : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <LocalizedLink href="/dashboard" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-5 h-5" />
            {locale === 'ar' ? 'العودة للوحة التحكم' : locale === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
          </LocalizedLink>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32" />
          
          <div className="px-6 pb-6 -mt-16">
            {/* Avatar & Name */}
                        <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-6">
              <div className="relative">
                {user.avatarUrl ? (
                  <div className="relative w-32 h-32 overflow-hidden rounded-2xl border-4 border-white shadow-lg">
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/default-avatar.png';  // Fallback image
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {/* ... rest of the code ... */}
            </div>

            {/* Contact Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                {t('contact_info')}
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{user.email}</span>
                </div>
                
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{user.phone}</span>
                </div>
              </div>
            </div>

            {/* Location */}
            {user.lat && user.lng && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5 text-blue-600" />
                  {t('location')}
                </h3>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <MapPinIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 font-mono">
                    {user.lat.toFixed(6)}, {user.lng.toFixed(6)}
                  </span>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm ml-auto"
                    >
                      {locale === 'ar' ? 'عرض على الخريطة' : locale === 'fr' ? 'Voir sur la carte' : 'View on map'}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Provider-Specific Information */}
            {user.role === 'PROVIDER' && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  {tProvider('provider_info')}
                </h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {user.hourlyRate && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-500 text-sm">{tProvider('hourly_rate')}:</span>
                      <span className="text-gray-900 font-medium">{user.hourlyRate.toLocaleString(locale === 'ar' ? 'ar-DZ' : 'en-US')} DZD/hour</span>
                    </div>
                  )}
                  
                  {user.yearsExperience && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-gray-500 text-sm">{tProvider('years_experience')}:</span>
                      <span className="text-gray-900">{user.yearsExperience} {user.yearsExperience === 1 ? 'year' : 'years'}</span>
                    </div>
                  )}
                  
                  {user.specialties && (
                    <div className="sm:col-span-2">
                      <p className="text-gray-500 text-sm mb-2">{tProvider('specialties')}:</p>
                      <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                        {user.specialties.split(',').filter(s => s.trim()).map((spec: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {spec.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {user.certifications && (
                    <div className="sm:col-span-2">
                      <p className="text-gray-500 text-sm mb-2">{tProvider('certifications')}:</p>
                      <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                        {user.certifications.split(',').filter(c => c.trim()).map((cert: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            {cert.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {user.bio && (
                    <div className="sm:col-span-2">
                      <p className="text-gray-500 text-sm mb-2">{tProvider('bio')}:</p>
                      <p className="text-gray-700 bg-gray-50 rounded-lg border border-gray-200 p-4 whitespace-pre-wrap">{user.bio}</p>
                    </div>
                  )}
                  
                  {user.serviceRadius && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <MapPinIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500 text-sm">{tProvider('location_radius')}:</span>
                      <span className="text-gray-900">{user.serviceRadius} km</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ✅ Reviews & Ratings Section - Shows for ANY provider profile */}
            {user.role === 'PROVIDER' && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  {tReviews('reviews_ratings')}
                </h3>
                
                {totalReviews > 0 ? (
                  <>
                    {/* Average Rating Summary */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 mb-6">
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-5xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
                          <ReviewStars rating={Math.round(averageRating)} size="lg" />
                          <p className="text-sm text-gray-600 mt-2">
                            {totalReviews} {totalReviews === 1 ? tReviews('review') : tReviews('reviews')}
                          </p>
                        </div>
                        
                        {/* Rating Breakdown */}
                        <div className="flex-1 space-y-2">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const count = reviews.filter(r => r.rating === stars).length;
                            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                              <div key={stars} className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-8">{stars} ★</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-400 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 w-6">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Reviews List */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">
                        {tReviews('all_reviews')}
                      </h4>
                      {reviews.map((review) => (
                        <ReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    {tReviews('no_reviews')}
                  </p>
                )}
              </div>
            )}

            {/* Account Information */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('account_info')}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">{t('member_since')}</p>
                  <p className="font-medium text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">{t('user_id')}</p>
                  <p className="font-mono text-gray-900 text-xs">{user.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}