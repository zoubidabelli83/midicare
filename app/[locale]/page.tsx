// app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/auth';
import { LocalizedLink } from '@/lib/navigation';

export default async function HomePage({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}) {
  // ✅ Await params first
  const { locale } = await params;
  
  // ✅ Pass locale to getTranslations with correct namespace
  const t = await getTranslations({ locale, namespace: 'home' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tActions = await getTranslations({ locale, namespace: 'actions' });
  
  const session = await getSession();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl mb-6">
            <span className="text-4xl">🏠</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            {t('welcome')}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            {!session ? (
              <>
                <LocalizedLink 
                  href="/login" 
                  className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {tNav('login')}
                </LocalizedLink>
                <LocalizedLink 
                  href="/register" 
                  className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {tNav('register')}
                </LocalizedLink>
              </>
            ) : (
              <LocalizedLink 
                href="/dashboard" 
                className="px-8 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {t('dashboard')}
              </LocalizedLink>
            )}
          </div>

          {/* Language Switcher */}
          <div className="flex justify-center gap-2">
            {['en', 'fr', 'ar'].map((loc) => (
              <a
                key={loc}
                href={`/${loc}`}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  locale === loc 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {loc.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t('how_it_works')}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('step1_title')}</h3>
              <p className="text-gray-600">{t('step1_desc')}</p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('step2_title')}</h3>
              <p className="text-gray-600">{t('step2_desc')}</p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('step3_title')}</h3>
              <p className="text-gray-600">{t('step3_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t('cta_title')}</h2>
          <p className="text-lg text-blue-100 mb-8">{t('cta_description')}</p>
          <LocalizedLink 
            href="/register" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg"
          >
            {t('get_started')}
            <span className="text-xl">→</span>
          </LocalizedLink>
        </div>
      </section>

      {/* Trust Badge */}
      <section className="py-8 px-4 text-center">
        <p className="text-gray-500 text-sm">
          {t('trusted_by')} 🇩🇿
        </p>
      </section>
    </div>
  );
}