// app/[locale]/register/page.tsx
'use client';

import { useState, ChangeEvent, FormEvent, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LocalizedLink } from '@/lib/navigation';
import MapSelector from '@/components/MapSelector';
import { Loader2, User, Mail, Phone, Lock, MapPin, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const t = useTranslations('forms');
  const tErrors = useTranslations('errors');
  const tSuccess = useTranslations('success');
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [success, setSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'SEEKER' as 'SEEKER' | 'PROVIDER',
  });

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (error) setError('');
      if (fieldError?.field === name) setFieldError(null);
    },
    [error, fieldError]
  );

  const handleLocationSelect = useCallback(
    (lat: number, lng: number) => {
      setLocation((prev) => {
        if (prev?.lat === lat && prev?.lng === lng) return prev;
        return { lat, lng };
      });
      if (error === tErrors('location_required')) {
        setError('');
      }
      if (fieldError?.field === 'location') {
        setFieldError(null);
      }
    },
    [error, tErrors, fieldError]
  );

  const handleAvatarChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError(`${tErrors('upload_failed')}: Invalid file type`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(`${tErrors('upload_failed')}: File too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
      setAvatarFile(file);
    },
    [tErrors]
  );

  const handleRemoveAvatar = useCallback(() => {
    setAvatarPreview(null);
    setAvatarFile(null);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.value = '';
  }, []);

  const validatePhone = useCallback((phone: string): boolean => /^0[5-7]\d{8}$/.test(phone), []);
  const validateEmail = useCallback((email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError('');
      setFieldError(null);
      setSuccess('');
      setLoading(true);

      if (!formData.name.trim()) {
        setFieldError({ field: 'name', message: 'Full name is required.' });
        setError('Please fill in all required fields correctly.');
        setLoading(false);
        return;
      }

      if (!validateEmail(formData.email)) {
        setFieldError({ field: 'email', message: 'Please enter a valid email address.' });
        setError('Invalid email format.');
        setLoading(false);
        return;
      }

      if (!validatePhone(formData.phone)) {
        setFieldError({
          field: 'phone',
          message: 'Phone must be exactly 10 digits in DZ format (05/06/07XXXXXXXX). Example: 0561234567',
        });
        setError('Phone number format is invalid.');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setFieldError({ field: 'password', message: 'Password must be at least 6 characters.' });
        setError('Password is too short.');
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setFieldError({ field: 'confirmPassword', message: 'Passwords do not match.' });
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      if (!location) {
        setFieldError({ field: 'location', message: tErrors('location_required') });
        setError(tErrors('location_required'));
        setLoading(false);
        return;
      }

      try {
        let avatarUrl: string | null = null;

        if (avatarFile) {
          const uploadData = new FormData();
          uploadData.append('file', avatarFile);

          try {
            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: uploadData,
            });

            const contentType = uploadRes.headers.get('content-type');
            const isJson = contentType?.includes('application/json');

            if (isJson) {
              const uploadResult = await uploadRes.json();
              if (uploadRes.ok && uploadResult.success) {
                avatarUrl = uploadResult.url;
              }
            }
          } catch {
            // Continue without avatar
          }
        }

        const registerBody = {
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          role: formData.role,
          lat: location.lat,
          lng: location.lng,
          avatarUrl,
        };

        const registerRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerBody),
        });

        const responseText = await registerRes.text();
        if (!responseText || !responseText.trim()) {
          throw new Error('Server returned empty response. Please try again.');
        }

        const contentType = registerRes.headers.get('content-type');
        if (contentType && !contentType.includes('application/json')) {
          throw new Error(`Server returned ${contentType} instead of JSON`);
        }

        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error('Server returned invalid JSON. Please try again.');
        }

        if (registerRes.ok && data?.success) {
          setSuccess(tSuccess('registered'));
          setFieldError(null);
          setFormData({
            name: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
            role: 'SEEKER',
          });
          setAvatarPreview(null);
          setAvatarFile(null);
          setLocation(null);

          setTimeout(() => {
            router.push(`/${locale}/login?registered=true`);
            router.refresh();
          }, 2500);
        } else {
          const apiError = data?.error || data?.message || tErrors('user_exists');
          const errorCode = data?.errorCode as string | undefined;
          const field = data?.field as string | undefined;

          if (field && apiError) {
            setFieldError({ field, message: apiError });
          }

          if (errorCode === 'INVALID_PHONE') {
            setError('Phone must be exactly 10 digits (DZ format). Example: 0561234567');
          } else if (errorCode === 'MISSING_FIELDS') {
            setError('Some required fields are missing. Please check all required inputs.');
          } else if (errorCode === 'USER_EXISTS') {
            setError('An account with this email already exists.');
          } else {
            setError(apiError);
          }
        }
      } catch (err: any) {
        let userError = tErrors('network_error');

        if (err?.message?.includes('empty response')) {
          userError = 'Server did not respond. Please check your connection.';
        } else if (err?.message?.includes('invalid JSON')) {
          userError = 'Server response error. Please try again.';
        } else if (err?.message?.includes('Failed to fetch') || err?.name === 'TypeError') {
          userError = 'Cannot connect to server. Please try again later.';
        } else if (err?.message) {
          userError = err.message;
        }

        setError(userError);
      } finally {
        setLoading(false);
      }
    },
    [formData, location, avatarFile, router, locale, tErrors, tSuccess, validateEmail, validatePhone]
  );

  useEffect(() => {
    return () => {};
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('register')}</h1>
          <p className="text-gray-600">
            {locale === 'ar'
              ? 'انضم إلى مجتمع الرعاية الموثوق في الجزائر'
              : locale === 'fr'
              ? 'Rejoignez la communauté de soins de confiance en Algérie'
              : "Join Algeria's trusted care community"}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-fade-in" role="alert">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
                {fieldError?.field === 'phone' && (
                  <p className="mt-1 text-xs text-red-700">
                    Hint: use 10 digits, e.g. <span className="font-mono">0561234567</span>
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="mt-1 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-md animate-fade-in" role="status">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
                <p className="mt-1 text-xs text-green-600">Redirecting to login...</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline-block w-4 h-4 mr-1" />
                {t('name')} <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                className={`input-field ${fieldError?.field === 'name' ? 'border-red-500' : ''}`}
                placeholder={locale === 'ar' ? 'أدخل اسمك الكامل' : locale === 'fr' ? 'Entrez votre nom complet' : 'Enter your full name'}
                aria-required="true"
              />
              {fieldError?.field === 'name' && <p className="mt-1 text-xs text-red-600">{fieldError.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline-block w-4 h-4 mr-1" />
                {t('email')} <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className={`input-field ${fieldError?.field === 'email' ? 'border-red-500' : ''}`}
                placeholder="example@email.com"
                aria-required="true"
              />
              {fieldError?.field === 'email' && <p className="mt-1 text-xs text-red-600">{fieldError.message}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline-block w-4 h-4 mr-1" />
                {t('phone')} <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                pattern="0[5-7]\d{8}"
                value={formData.phone}
                onChange={handleChange}
                className={`input-field ${fieldError?.field === 'phone' ? 'border-red-500' : ''}`}
                placeholder="0551234567"
                aria-required="true"
              />
              {fieldError?.field === 'phone' && <p className="mt-1 text-xs text-red-600">{fieldError.message}</p>}
              <p className="mt-1 text-xs text-gray-500">
                {locale === 'ar' ? 'مثال: 0551234567' : locale === 'fr' ? 'Ex: 0551234567' : 'Ex: 0551234567'}
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="inline-block w-4 h-4 mr-1" />
                {t('password')} <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                className={`input-field ${fieldError?.field === 'password' ? 'border-red-500' : ''}`}
                placeholder="••••••••"
                aria-required="true"
              />
              {fieldError?.field === 'password' && <p className="mt-1 text-xs text-red-600">{fieldError.message}</p>}
              <p className="mt-1 text-xs text-gray-500">{t('password_min')}</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="inline-block w-4 h-4 mr-1" />
                {t('confirm_password')} <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input-field ${fieldError?.field === 'confirmPassword' ? 'border-red-500' : ''}`}
                placeholder="••••••••"
                aria-required="true"
              />
              {fieldError?.field === 'confirmPassword' && <p className="mt-1 text-xs text-red-600">{fieldError.message}</p>}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                {t('role')} <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input-field"
                aria-required="true"
              >
                <option value="SEEKER">{t('role_seeker')}</option>
                <option value="PROVIDER">{t('role_provider')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Upload className="inline-block w-4 h-4 mr-1" />
                {t('avatar')}
              </label>
              <div className="flex items-center gap-4">
                {avatarPreview ? (
                  <div className="relative">
                    <img src={avatarPreview} alt="Preview" className="w-20 h-20 rounded-full object-cover border-4 border-blue-500 shadow-md" />
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition shadow-sm"
                      aria-label="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <User className="w-10 h-10" />
                  </div>
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-1 text-sm text-gray-600 font-medium">{t('upload_avatar')}</p>
                    <p className="text-xs text-gray-500">JPG, PNG • Max 5MB</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" aria-label={t('upload_avatar')} />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline-block w-4 h-4 mr-1" />
                {t('location')} <span className="text-red-500">*</span>
              </label>
              <div className={`border-2 rounded-lg overflow-hidden shadow-sm ${fieldError?.field === 'location' ? 'border-red-500' : 'border-gray-300'}`}>
                <MapSelector initialLat={location?.lat} initialLng={location?.lng} onLocationSelect={handleLocationSelect} />
              </div>
              {fieldError?.field === 'location' && <p className="mt-1 text-xs text-red-600">{fieldError.message}</p>}
              {location && (
                <p className="mt-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1.5 flex-shrink-0" />
                  <span className="font-mono">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </span>
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {locale === 'ar'
                  ? 'انقر على الخريطة لتحديد موقعك'
                  : locale === 'fr'
                  ? 'Cliquez sur la carte pour sélectionner votre emplacement'
                  : 'Click on the map to select your location'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed py-3 px-4 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{locale === 'ar' ? 'جاري التسجيل...' : locale === 'fr' ? 'Inscription en cours...' : 'Creating account...'}</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>{tSuccess('registered')}</span>
                </>
              ) : (
                <span>{t('register')}</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              {t('already_have_account')}{' '}
              <LocalizedLink href="/login" className="text-blue-600 hover:text-blue-700 font-semibold underline transition">
                {t('login')}
              </LocalizedLink>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            {locale === 'ar'
              ? 'بالتسجيل، فإنك توافق على شروط الاستخدام وسياسة الخصوصية'
              : locale === 'fr'
              ? "En vous inscrivant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité"
              : 'By registering, you agree to our Terms of Service and Privacy Policy'}
          </p>
          <p className="mt-1">© 2024 Midicare • Algeria</p>
        </div>
      </div>
    </div>
  );
}
