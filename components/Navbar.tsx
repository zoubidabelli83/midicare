// components/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { LocalizedLink } from '@/lib/navigation';
import { 
  User, LogOut, Menu, X, Shield, Home, FileText, 
  BarChart3, ChevronDown, Settings, Bell, Loader2
} from 'lucide-react';
import Image from 'next/image';

interface Session {
  userId: string;
  role: 'ADMIN' | 'SEEKER' | 'PROVIDER';
  email: string;
  name?: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
}

export default function Navbar() {
  const t = useTranslations('nav');
  const tDashboard = useTranslations('dashboard');
  const locale = useLocale();
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ✅ Fetch session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        setSession(data?.user || null);
      } catch (error) {
        console.error('Failed to fetch session:', error);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  // Handle scroll effect for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [locale]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-profile-dropdown]')) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Logout handler
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      setSession(null);
      window.location.href = `/${locale}/login`;
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = `/${locale}/login`;
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const roleLabels: Record<string, Record<string, string>> = {
    en: { ADMIN: 'Admin', SEEKER: 'Seeker', PROVIDER: 'Provider' },
    fr: { ADMIN: 'Admin', SEEKER: 'Demandeur', PROVIDER: 'Prestataire' },
    ar: { ADMIN: 'مشرف', SEEKER: 'باحث', PROVIDER: 'مقدم' },
  };

  const userRole = session?.role ? roleLabels[locale]?.[session.role] || session.role : '';

  // Show loading state
  if (loading) {
    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gray-200 animate-pulse" />
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse" />
              <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100' 
          : 'bg-white border-b border-gray-200'
      }`}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <LocalizedLink 
            href="/" 
            className="flex items-center gap-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <span className="text-white font-bold text-lg">🏠</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Hayati
            </span>
          </LocalizedLink>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {session ? (
              <>
                <LocalizedLink 
                  href="/dashboard" 
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  <Home className="w-4 h-4" />
                  {t('dashboard')}
                </LocalizedLink>

                {session.role === 'SEEKER' && (
                  <LocalizedLink 
                    href="/demand/new" 
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    {tDashboard('post_demand')}
                  </LocalizedLink>
                )}

                {session.role === 'ADMIN' && (
                  <>
                    <LocalizedLink 
                      href="/admin" 
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      {t('adminPanel')}
                    </LocalizedLink>
                    <LocalizedLink 
                      href="/admin/analytics" 
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                    >
                      <BarChart3 className="w-4 h-4" />
                      {t('analytics')}
                    </LocalizedLink>
                  </>
                )}
              </>
            ) : (
              <>
                <LocalizedLink 
                  href="/login" 
                  className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  {t('login')}
                </LocalizedLink>
                <LocalizedLink 
                  href="/register" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm hover:shadow"
                >
                  {t('register')}
                </LocalizedLink>
              </>
            )}
          </div>

          {/* Right Side: User Menu + Language Switcher */}
          <div className="flex items-center gap-2">
            
            {/* Language Switcher */}
            <div className="relative" data-profile-dropdown>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                aria-label="Switch language"
              >
                <span className="uppercase font-semibold">{locale}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isProfileOpen && (
                <div 
                  className={`absolute ${locale === 'ar' ? 'left-0' : 'right-0'} top-full mt-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-fade-in`}
                  data-profile-dropdown
                >
                  {['en', 'fr', 'ar'].map((lang) => (
                    <a
                      key={lang}
                      href={`/${lang}`}
                      className={`flex items-center gap-2 px-4 py-2 text-sm ${
                        locale === lang 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-700 hover:bg-gray-50'
                      } transition-colors`}
                      onClick={() => setIsProfileOpen(false)}
                    >
                      {lang === 'ar' && <span>🇸🇦</span>}
                      {lang === 'fr' && <span>🇫🇷</span>}
                      {lang === 'en' && <span>🇬🇧</span>}
                      <span>{lang.toUpperCase()}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* User Menu (if logged in) */}
            {session ? (
              <div className="relative" data-profile-dropdown>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 p-1.5 hover:bg-gray-100 rounded-xl transition-colors"
                  aria-label="User menu"
                >
                  {/* Avatar */}
                  {session.avatarUrl ? (
                    <div className="relative w-9 h-9 overflow-hidden rounded-full border-2 border-white shadow-sm">
                      <img
                      src={session.avatarUrl}
                      alt={session.name || 'User'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                      // Fallback to initials if image fails to load
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTgiIGN5PSIxOCIgcj0iMTgiIGZpbGw9IiMzYjgyZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5VPC90ZXh0Pjwvc3ZnPg==';
                    }}
    />
  </div>
) : (
  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
    {getInitials(session.name, session.email)}
  </div>
)}
                  
                  {/* User Info (desktop only) */}
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-900 line-clamp-1">
                      {session.name || session.email.split('@')[0]}
                    </span>
                    <span className="text-xs text-gray-500">{userRole}</span>
                  </div>
                  
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div 
                    className={`absolute ${locale === 'ar' ? 'left-0' : 'right-0'} top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-fade-in`}
                    data-profile-dropdown
                  >
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {session.name || session.email}
                      </p>
                      <p className="text-xs text-gray-500">{session.email}</p>
                      {!session.isVerified && session.role !== 'ADMIN' && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                          {t('pending_verification')}
                        </span>
                      )}
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <LocalizedLink 
                        href="/dashboard" 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Home className="w-4 h-4" />
                        {t('dashboard')}
                      </LocalizedLink>
                      
                      <LocalizedLink 
                        href="/profile" 
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        {locale === 'ar' ? 'إعدادات الحساب' : locale === 'fr' ? 'Paramètres' : 'Account Settings'}
                      </LocalizedLink>
                      
                      {session.role === 'ADMIN' && (
                        <>
                          <LocalizedLink 
                            href="/admin" 
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <Shield className="w-4 h-4" />
                            {t('adminPanel')}
                          </LocalizedLink>
                          <LocalizedLink 
                            href="/admin/analytics" 
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <BarChart3 className="w-4 h-4" />
                            {t('analytics')}
                          </LocalizedLink>
                        </>
                      )}
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-100 my-1" />
                    
                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isLoggingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      {isLoggingOut 
                        ? (locale === 'ar' ? 'جاري الخروج...' : locale === 'fr' ? 'Déconnexion...' : 'Logging out...')
                        : t('logout')
                      }
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Guest: Login/Register Buttons (mobile) */
              <div className="md:hidden flex items-center gap-2">
                <LocalizedLink 
                  href="/login" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  {t('login')}
                </LocalizedLink>
                <LocalizedLink 
                  href="/register" 
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  {t('register')}
                </LocalizedLink>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md animate-fade-in">
          <div className="px-4 py-4 space-y-2">
            {session ? (
              <>
                {/* User Info */}
                <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl mb-3">
                  {session.avatarUrl ? (
                    <div className="relative w-12 h-12">
                      <Image
                        src={session.avatarUrl}
                        alt={session.name || 'User'}
                        fill
                        className="rounded-full object-cover border-2 border-white"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {getInitials(session.name, session.email)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {session.name || session.email.split('@')[0]}
                    </p>
                    <p className="text-sm text-gray-500">{userRole}</p>
                    {!session.isVerified && session.role !== 'ADMIN' && (
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        {t('pending_verification')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Nav Links */}
                <LocalizedLink 
                  href="/dashboard" 
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Home className="w-5 h-5" />
                  {t('dashboard')}
                </LocalizedLink>

                {session.role === 'SEEKER' && (
                  <LocalizedLink 
                    href="/demand/new" 
                    className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FileText className="w-5 h-5" />
                    {tDashboard('post_demand')}
                  </LocalizedLink>
                )}

                {session.role === 'ADMIN' && (
                  <>
                    <LocalizedLink 
                      href="/admin" 
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Shield className="w-5 h-5" />
                      {t('adminPanel')}
                    </LocalizedLink>
                    <LocalizedLink 
                      href="/admin/analytics" 
                      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <BarChart3 className="w-5 h-5" />
                      {t('analytics')}
                    </LocalizedLink>
                  </>
                )}

                <LocalizedLink 
                  href="/profile" 
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Settings className="w-5 h-5" />
                  {locale === 'ar' ? 'إعدادات الحساب' : locale === 'fr' ? 'Paramètres' : 'Account Settings'}
                </LocalizedLink>

                {/* Mobile Logout */}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogOut className="w-5 h-5" />
                  )}
                  {isLoggingOut 
                    ? (locale === 'ar' ? 'جاري الخروج...' : locale === 'fr' ? 'Déconnexion...' : 'Logging out...')
                    : t('logout')
                  }
                </button>
              </>
            ) : (
              <>
                <LocalizedLink 
                  href="/login" 
                  className="block px-4 py-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('login')}
                </LocalizedLink>
                <LocalizedLink 
                  href="/register" 
                  className="block px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('register')}
                </LocalizedLink>
              </>
            )}

            {/* Mobile Language Switcher */}
            <div className="pt-3 border-t border-gray-100">
              <p className="px-4 text-xs font-medium text-gray-500 mb-2">
                {locale === 'ar' ? 'اللغة' : locale === 'fr' ? 'Langue' : 'Language'}
              </p>
              <div className="flex gap-2 px-2">
                {['en', 'fr', 'ar'].map((lang) => (
                  <a
                    key={lang}
                    href={`/${lang}`}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      locale === lang 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {lang.toUpperCase()}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}