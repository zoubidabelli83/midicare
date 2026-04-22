// app/[locale]/demand/new/page.tsx
'use client';

import { useState, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LocalizedLink } from '@/lib/navigation';
import MapSelector from '@/components/MapSelector';
import { ArrowLeft, MapPin, Loader2, AlertCircle } from 'lucide-react';

export default function NewDemandPage() {
  const t = useTranslations('demand');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setLocation({ lat, lng });
    if (error) setError('');
  }, [error]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.title.trim() || !formData.description.trim()) {
      setError(t('error_missing'));
      setLoading(false);
      return;
    }

    if (!location) {
      setError(t('error_location'));
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          lat: location.lat,
          lng: location.lng,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Redirect to dashboard with success message
        router.push(`/${locale}/dashboard?demandPosted=true`);
        router.refresh();
      } else {
        setError(data.error || tErrors('network_error'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(tErrors('network_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <LocalizedLink 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {locale === 'ar' ? 'العودة للوحة التحكم' : locale === 'fr' ? 'Retour au tableau de bord' : 'Back to Dashboard'}
          </LocalizedLink>
          <h1 className="text-3xl font-bold text-gray-900">{t('new_title')}</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
          
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              {t('title_label')} <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              maxLength={100}
              value={formData.title}
              onChange={handleChange}
              className="input-field"
              placeholder={t('title_placeholder')}
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.title.length}/100
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              {t('description_label')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              maxLength={500}
              value={formData.description}
              onChange={handleChange}
              className="input-field resize-none"
              placeholder={t('description_placeholder')}
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {formData.description.length}/500
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline-block w-4 h-4 mr-1" />
              {t('location_label')} <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <MapSelector 
                initialLat={location?.lat} 
                initialLng={location?.lng}
                onLocationSelect={handleLocationSelect}
              />
            </div>
            {location && (
              <p className="mt-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">
                ✅ {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">{t('location_hint')}</p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <LocalizedLink
              href="/dashboard"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition text-center"
            >
              {locale === 'ar' ? 'إلغاء' : locale === 'fr' ? 'Annuler' : 'Cancel'}
            </LocalizedLink>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{locale === 'ar' ? 'جاري النشر...' : locale === 'fr' ? 'Publication...' : 'Posting...'}</span>
                </>
              ) : (
                <span>{t('submit')}</span>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            {locale === 'ar' ? 'سيظهر طلبك لمقدمي الخدمات في منطقتك' : 
             locale === 'fr' ? 'Votre demande sera visible aux prestataires de votre région' :
             'Your demand will be visible to providers in your area'}
          </p>
        </div>
      </div>
    </div>
  );
}