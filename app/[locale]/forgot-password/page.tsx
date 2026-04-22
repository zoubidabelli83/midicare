// app/[locale]/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { LocalizedLink } from '@/lib/navigation';
import { Mail, Loader2, AlertCircle, CheckCircle, ArrowLeft, Home } from 'lucide-react';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ✅ Extract disabled state for clarity
  const isDisabled = loading || success;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.error('API returned non-JSON response:', contentType);
        throw new Error('Server returned invalid response');
      }

      const responseText = await res.text();
      if (!responseText) {
        console.error('API returned empty response');
        throw new Error('Server returned empty response');
      }

      const data = JSON.parse(responseText);

      if (res.ok && data.success) {
        setSuccess(data.message);
        setEmail('');
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        
        <div className="text-center mb-8">
          <LocalizedLink href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">🏠</span>
            </div>
          </LocalizedLink>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('forgot_password_title')}
          </h1>
          <p className="text-gray-600">
            {t('forgot_password_subtitle')}
          </p>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('email_label')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                // ✅ Fixed: Explicit boolean for disabled prop
                disabled={Boolean(isDisabled)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
                placeholder={t('email_placeholder')}
              />
            </div>
          </div>

          <button
            type="submit"
            // ✅ Fixed: Explicit boolean for disabled prop
            disabled={Boolean(isDisabled)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{locale === 'ar' ? 'جاري الإرسال...' : locale === 'fr' ? 'Envoi...' : 'Sending...'}</span>
              </>
            ) : (
              <span>{t('send_reset_link')}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <LocalizedLink href="/login" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            {t('back_to_login')}
          </LocalizedLink>
          
          <LocalizedLink href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <Home className="w-4 h-4" />
            {locale === 'ar' ? 'العودة للرئيسية' : locale === 'fr' ? "Retour à l'accueil" : 'Back to Home'}
          </LocalizedLink>
        </div>
      </div>
    </div>
  );
}