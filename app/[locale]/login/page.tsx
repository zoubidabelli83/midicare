// app/[locale]/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LocalizedLink } from '@/lib/navigation';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, Home } from 'lucide-react';

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate input
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      console.log('📤 Sending login request...');
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log('📥 Login response:', data);

      if (res.ok && data.success) {
        console.log('✅ Login successful for:', data.user.email);
        console.log('👤 User role:', data.user.role);
        
        const redirectPath = data.user.role === 'ADMIN' 
          ? `/${locale}/admin` 
          : `/${locale}/dashboard`;
        
        console.log('🔄 Redirecting to:', redirectPath);
        
        // ✅ Use window.location.href to force full page reload
        // This ensures the session cookie is properly recognized
        window.location.href = redirectPath;
      } else {
        console.error('❌ Login failed:', data.error);
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error('💥 Login error:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <LocalizedLink href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">🏠</span>
            </div>
          </LocalizedLink>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('login_title')}
          </h1>
          <p className="text-gray-600">
            {t('login_subtitle')}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Email */}
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
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                disabled={loading}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
                placeholder={t('email_placeholder')}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('password_label')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                disabled={loading}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
                placeholder={t('password_placeholder')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* ✅ Forgot Password Link */}
            <div className="text-right mt-2">
              <LocalizedLink 
                href="/forgot-password" 
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                {t('forgot_password_link')}
              </LocalizedLink>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{locale === 'ar' ? 'جاري تسجيل الدخول...' : locale === 'fr' ? 'Connexion...' : 'Logging in...'}</span>
              </>
            ) : (
              <span>{t('login_button')}</span>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-4">
          <p className="text-sm text-gray-600">
            {t('no_account')}{' '}
            <LocalizedLink href="/register" className="text-blue-600 hover:underline font-medium">
              {t('register_link')}
            </LocalizedLink>
          </p>
          
          <LocalizedLink 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Home className="w-4 h-4" />
            {locale === 'ar' ? 'العودة للرئيسية' : locale === 'fr' ? "Retour à l'accueil" : 'Back to Home'}
          </LocalizedLink>
        </div>

        {/* Test Accounts Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-semibold text-blue-800 mb-2">
            {locale === 'ar' ? 'حسابات تجريبية:' : locale === 'fr' ? 'Comptes de test:' : 'Test Accounts:'}
          </p>
          <div className="text-xs text-blue-700 space-y-1">
            <p><strong>Admin:</strong> admin@hayati.com / admin123</p>
            <p><strong>Seeker:</strong> seeker@hayati.com / seeker123</p>
            <p><strong>Provider:</strong> provider@hayati.com / provider123</p>
          </div>
        </div>
      </div>
    </div>
  );
}