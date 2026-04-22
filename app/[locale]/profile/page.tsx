// app/[locale]/profile/page.tsx
'use client';

import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { LocalizedLink } from '@/lib/navigation';
import { 
  User, Mail, Phone, MapPin, Lock, Loader2, AlertCircle, 
  CheckCircle, Camera, ArrowLeft, Shield, Edit3, Save, X, Briefcase
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name: string;
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
  serviceRadius?: number | null;
  certifications?: string | null;
  bio?: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tErrors = useTranslations('errors');
  const tSuccess = useTranslations('success');
  const tNav = useTranslations('nav');
  const tProvider = useTranslations('provider');
  const locale = useLocale();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    hourlyRate: '',
    yearsExperience: '',
    specialties: '',
    serviceRadius: '',
    certifications: '',
    bio: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch('/api/profile', {
        headers: { 'Content-Type': 'application/json' },
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const rawText = await res.text();
        console.error('Profile API returned non-JSON:', {
          status: res.status,
          contentType,
          preview: rawText.substring(0, 200)
        });
        throw new Error('Server returned invalid response');
      }
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load profile');
      }
      
      setUser(data.user);
      setFormData({
        name: data.user.name,
        phone: data.user.phone,
        hourlyRate: data.user.hourlyRate?.toString() || '',
        yearsExperience: data.user.yearsExperience?.toString() || '',
        specialties: data.user.specialties || '',
        serviceRadius: data.user.serviceRadius?.toString() || '',
        certifications: data.user.certifications || '',
        bio: data.user.bio || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setAvatarPreview(data.user.avatarUrl || null);
      
    } catch (err: any) {
      console.error('Profile fetch error:', err);
      setError(err.message || tErrors('network_error'));
      
      if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
        router.push(`/${locale}/login`);
      }
    } finally {
      setLoading(false);
    }
  }, [locale, router, tErrors]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  }, [error]);

  const handleAvatarChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(tErrors('upload_failed') + ': Invalid file type');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(tErrors('upload_failed') + ': File too large (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setAvatarFile(file);
  }, [tErrors]);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarPreview(null);
    setAvatarFile(null);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.value = '';
  }, []);

  const validatePhone = useCallback((phone: string): boolean => {
    return /^0[5-7]\d{8}$/.test(phone);
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    if (!formData.name.trim()) {
      setError('Name is required');
      setSaving(false);
      return;
    }

    if (!validatePhone(formData.phone)) {
      setError(tErrors('phone_invalid'));
      setSaving(false);
      return;
    }

    if (formData.newPassword) {
      if (formData.newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        setSaving(false);
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setError(tErrors('password_mismatch'));
        setSaving(false);
        return;
      }
      if (!formData.currentPassword) {
        setError('Current password is required to change password');
        setSaving(false);
        return;
      }
    }

    try {
      let avatarUrl = user?.avatarUrl || null;
      
      if (avatarFile) {
        const uploadData = new FormData();
        uploadData.append('file', avatarFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });

        const contentType = uploadRes.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const uploadResult = await uploadRes.json();
          if (uploadRes.ok && uploadResult.success) {
            avatarUrl = uploadResult.url;
          }
        }
      }

      const updateData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        avatarUrl,
      };

      if (user?.role === 'PROVIDER') {
        if (formData.hourlyRate) updateData.hourlyRate = parseFloat(formData.hourlyRate);
        if (formData.yearsExperience) updateData.yearsExperience = parseInt(formData.yearsExperience);
        if (formData.specialties) updateData.specialties = formData.specialties.trim();
        if (formData.serviceRadius) updateData.serviceRadius = parseFloat(formData.serviceRadius);
        if (formData.certifications) updateData.certifications = formData.certifications.trim();
        if (formData.bio) updateData.bio = formData.bio.trim();
      }

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const resContentType = res.headers.get('content-type');
      if (!resContentType?.includes('application/json')) {
        const rawText = await res.text();
        console.error('Profile update API returned non-JSON:', {
          status: res.status,
          contentType: resContentType,
          preview: rawText.substring(0, 200)
        });
        throw new Error('Server returned invalid response');
      }

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(tSuccess('profile_updated'));
        setIsEditing(false);
        fetchProfile();
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
        setAvatarFile(null);
      } else {
        setError(data.error || 'Failed to update profile');
      }

    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || tErrors('network_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = useCallback(() => {
    if (user) {
      setFormData({
        name: user.name,
        phone: user.phone,
        hourlyRate: user.hourlyRate?.toString() || '',
        yearsExperience: user.yearsExperience?.toString() || '',
        specialties: user.specialties || '',
        serviceRadius: user.serviceRadius?.toString() || '',
        certifications: user.certifications || '',
        bio: user.bio || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setAvatarPreview(user.avatarUrl || null);
      setAvatarFile(null);
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">
            {locale === 'ar' ? 'جاري التحميل...' : locale === 'fr' ? 'Chargement...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Profile</h2>
          <p className="text-gray-600 mb-6">{error || 'Please try again'}</p>
          <div className="flex gap-3">
            <button
              onClick={() => fetchProfile()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Retry
            </button>
            <LocalizedLink
              href="/dashboard"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-center"
            >
              {tNav('dashboard')}
            </LocalizedLink>
          </div>
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

  // Specialty options with translations
  const specialtyOptions = [
    { value: 'Elderly Care', label: 'Elderly Care', labelAr: 'رعاية المسنين', labelFr: 'Soins aux personnes âgées' },
    { value: 'Child Care', label: 'Child Care/Babysitting', labelAr: 'رعاية الأطفال', labelFr: 'Garde d\'enfants' },
    { value: 'Medical Assistance', label: 'Medical Assistance', labelAr: 'المساعدة الطبية', labelFr: 'Assistance médicale' },
    { value: 'Physical Therapy', label: 'Physical Therapy', labelAr: 'العلاج الطبيعي', labelFr: 'Physiothérapie' },
    { value: 'Nursing Care', label: 'Nursing Care', labelAr: 'التمريض', labelFr: 'Soins infirmiers' },
    { value: 'Disability Care', label: 'Disability Care', labelAr: 'رعاية ذوي الاحتياجات الخاصة', labelFr: 'Soins aux personnes handicapées' },
    { value: 'Post-Surgery Care', label: 'Post-Surgery Care', labelAr: 'الرعاية بعد الجراحة', labelFr: 'Soins post-opératoires' },
    { value: 'Dementia Care', label: 'Dementia/Alzheimer\'s Care', labelAr: 'رعاية الخرف', labelFr: 'Soins de démence' },
    { value: 'Companionship', label: 'Companionship', labelAr: 'الرفقة', labelFr: 'Compagnie' },
    { value: 'Housekeeping', label: 'Housekeeping/Light Cleaning', labelAr: 'التنظيف الخفيف', labelFr: 'Ménage léger' },
    { value: 'Meal Preparation', label: 'Meal Preparation', labelAr: 'تحضير الوجبات', labelFr: 'Préparation des repas' },
    { value: 'Medication Management', label: 'Medication Management', labelAr: 'إدارة الأدوية', labelFr: 'Gestion des médicaments' },
    { value: 'Mobility Assistance', label: 'Mobility Assistance', labelAr: 'مساعدة الحركة', labelFr: 'Assistance à la mobilité' },
    { value: 'Personal Care', label: 'Personal Care/Hygiene', labelAr: 'النظافة الشخصية', labelFr: 'Hygiène personnelle' },
    { value: 'Respite Care', label: 'Respite Care', labelAr: 'الرعاية المؤقتة', labelFr: 'Soins de répit' },
  ];

  // Certification options with translations
  const certificationOptions = [
    { value: 'First Aid Certified', label: 'First Aid Certified', labelAr: 'شهادة الإسعافات الأولية', labelFr: 'Certifié en premiers secours' },
    { value: 'CPR Certified', label: 'CPR Certified', labelAr: 'شهادة الإنعاش القلبي الرئوي', labelFr: 'Certifié en RCP' },
    { value: 'Certified Nursing Assistant (CNA)', label: 'Certified Nursing Assistant (CNA)', labelAr: 'مساعد تمريض معتمد', labelFr: 'Auxiliaire de santé certifié' },
    { value: 'Licensed Practical Nurse (LPN)', label: 'Licensed Practical Nurse (LPN)', labelAr: 'ممرض ممارس مرخص', labelFr: 'Infirmier pratique autorisé' },
    { value: 'Registered Nurse (RN)', label: 'Registered Nurse (RN)', labelAr: 'ممرض مسجل', labelFr: 'Infirmier autorisé' },
    { value: 'Home Health Aide (HHA)', label: 'Home Health Aide (HHA)', labelAr: 'مساعد رعاية منزلية', labelFr: 'Aide à domicile certifié' },
    { value: 'Alzheimer\'s Care Certification', label: 'Alzheimer\'s/Dementia Care', labelAr: 'شهادة رعاية الخرف', labelFr: 'Soins Alzheimer/démence' },
    { value: 'Pediatric Care Certification', label: 'Pediatric Care', labelAr: 'شهادة رعاية الأطفال', labelFr: 'Soins pédiatriques' },
    { value: 'Disability Care Certification', label: 'Disability Care', labelAr: 'شهادة رعاية ذوي الاحتياجات', labelFr: 'Soins aux handicapés' },
    { value: 'Palliative Care Certification', label: 'Palliative Care', labelAr: 'شهادة الرعاية التلطيفية', labelFr: 'Soins palliatifs' },
    { value: 'Medical Assistant Certified', label: 'Medical Assistant', labelAr: 'مساعد طبي معتمد', labelFr: 'Assistant médical certifié' },
    { value: 'Medication Administration Certified', label: 'Medication Administration', labelAr: 'شهادة إعطاء الأدوية', labelFr: 'Administration de médicaments' },
    { value: 'State Licensed Caregiver', label: 'State Licensed Caregiver', labelAr: 'مقدم رعاية مرخص', labelFr: 'Aidant agréé par l\'État' },
  ];

  // Handle checkbox change for specialties
  const handleSpecialtyChange = (value: string, checked: boolean) => {
    const current = formData.specialties.split(',').filter(s => s.trim());
    if (checked) {
      setFormData(prev => ({ ...prev, specialties: [...current, value].join(',') }));
    } else {
      setFormData(prev => ({ ...prev, specialties: current.filter(s => s !== value).join(',') }));
    }
  };

  // Handle checkbox change for certifications
  const handleCertificationChange = (value: string, checked: boolean) => {
    const current = formData.certifications.split(',').filter(c => c.trim());
    if (checked) {
      setFormData(prev => ({ ...prev, certifications: [...current, value].join(',') }));
    } else {
      setFormData(prev => ({ ...prev, certifications: current.filter(c => c !== value).join(',') }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <LocalizedLink 
              href="/dashboard" 
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </LocalizedLink>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('title')}
              </h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              <Edit3 className="w-4 h-4" />
              {t('edit')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                {t('cancel')}
              </button>
              <button
                onClick={() => document.querySelector('form')?.requestSubmit()}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t('save')}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-md animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32" />
          
          <div className="px-6 pb-6 -mt-16">
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-6">
              <div className="relative">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt={user.name}
                    className="w-32 h-32 rounded-2xl object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                
                {isEditing && (
                  <>
                    <label className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50 transition">
                      <Camera className="w-5 h-5 text-gray-600" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition shadow-md"
                        aria-label="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
              
              <div className="flex-1 pb-2">
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full sm:w-auto"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {roleLabel}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                    {statusLabel}
                  </span>
                  {user.isVerified && user.role !== 'ADMIN' && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {locale === 'ar' ? 'مُتحقق' : locale === 'fr' ? 'Vérifié' : 'Verified'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  {t('contact_info')}
                </h3>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('email')}
                    </label>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{user.email}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {locale === 'ar' ? 'لا يمكن تغيير البريد الإلكتروني' : locale === 'fr' ? "L'email ne peut pas être modifié" : 'Email cannot be changed'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Phone className="inline-block w-4 h-4 mr-1" />
                      {t('phone')}
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        pattern="0[5-7]\d{8}"
                        placeholder="0551234567"
                        className="input-field"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {user.role !== 'ADMIN' && user.lat && user.lng && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    {t('location')}
                  </h3>
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 font-mono">
                      {user.lat.toFixed(6)}, {user.lng.toFixed(6)}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${user.lat},${user.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm ml-auto"
                    >
                      {locale === 'ar' ? 'عرض على الخريطة' : locale === 'fr' ? 'Voir sur la carte' : 'View on map'}
                    </a>
                  </div>
                </div>
              )}

              {user.role === 'PROVIDER' && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    {tProvider('provider_info')}
                  </h3>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Hourly Rate - Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {tProvider('hourly_rate')}
                      </label>
                      {isEditing ? (
                        <select
                          name="hourlyRate"
                          value={formData.hourlyRate}
                          onChange={handleChange}
                          className="input-field"
                        >
                          <option value="">Select hourly rate</option>
                          {[1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000].map((rate) => (
                            <option key={rate} value={rate}>
                              {rate.toLocaleString(locale === 'ar' ? 'ar-DZ' : 'en-US')} DZD/hour
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-gray-900 font-medium">
                            {user.hourlyRate ? `${user.hourlyRate.toLocaleString(locale === 'ar' ? 'ar-DZ' : 'en-US')} DZD/hour` : 'Not set'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Years of Experience - Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {tProvider('years_experience')}
                      </label>
                      {isEditing ? (
                        <select
                          name="yearsExperience"
                          value={formData.yearsExperience}
                          onChange={handleChange}
                          className="input-field"
                        >
                          <option value="">Select years</option>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((years) => (
                            <option key={years} value={years}>
                              {years} {years === 1 ? 'year' : 'years'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-gray-900">
                            {user.yearsExperience ? `${user.yearsExperience} ${user.yearsExperience === 1 ? 'year' : 'years'}` : 'Not set'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ✅ Specialties - Checkbox Multi-Select */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {tProvider('specialties')}
                      </label>
                      {isEditing ? (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {specialtyOptions.map((specialty) => {
                              const isSelected = formData.specialties.split(',').filter(s => s.trim()).includes(specialty.value);
                              return (
                                <label key={specialty.value} className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer transition">
                                  <input
                                    type="checkbox"
                                    value={specialty.value}
                                    checked={isSelected}
                                    onChange={(e) => handleSpecialtyChange(specialty.value, e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {locale === 'ar' ? specialty.labelAr : locale === 'fr' ? specialty.labelFr : specialty.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 min-h-[42px]">
                          {user.specialties?.split(',').filter(s => s.trim()).map((spec: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {spec.trim()}
                            </span>
                          )) || <span className="text-gray-500">Not set</span>}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {locale === 'ar' ? 'اختر كل التخصصات التي تنطبق عليك' : locale === 'fr' ? 'Sélectionnez toutes les spécialités qui s\'appliquent' : 'Select all specialties that apply'}
                      </p>
                    </div>

                    {/* Service Radius */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {tProvider('location_radius')}
                      </label>
                      {isEditing ? (
                        <select
                          name="serviceRadius"
                          value={formData.serviceRadius}
                          onChange={handleChange}
                          className="input-field"
                        >
                          <option value="">Select service radius</option>
                          {[5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map((radius) => (
                            <option key={radius} value={radius}>
                              {radius} km
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">
                            {user.serviceRadius ? `${user.serviceRadius} km` : 'Not set'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ✅ Certifications - Checkbox Multi-Select */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {tProvider('certifications')}
                      </label>
                      {isEditing ? (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {certificationOptions.map((cert) => {
                              const isSelected = formData.certifications.split(',').filter(c => c.trim()).includes(cert.value);
                              return (
                                <label key={cert.value} className="flex items-center gap-2 p-2 rounded hover:bg-white cursor-pointer transition">
                                  <input
                                    type="checkbox"
                                    value={cert.value}
                                    checked={isSelected}
                                    onChange={(e) => handleCertificationChange(cert.value, e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {locale === 'ar' ? cert.labelAr : locale === 'fr' ? cert.labelFr : cert.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 min-h-[42px]">
                          {user.certifications?.split(',').filter(c => c.trim()).map((cert: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                              {cert.trim()}
                            </span>
                          )) || <span className="text-gray-500">Not set</span>}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {locale === 'ar' ? 'اختر كل الشهادات التي تمتلكها' : locale === 'fr' ? 'Sélectionnez toutes les certifications que vous possédez' : 'Select all certifications you hold'}
                      </p>
                    </div>

                    {/* Bio */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {tProvider('bio')}
                      </label>
                      {isEditing ? (
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleChange}
                          rows={4}
                          placeholder={tProvider('bio_placeholder')}
                          className="input-field resize-none"
                        />
                      ) : (
                        <p className="text-gray-700 bg-gray-50 rounded-lg border border-gray-200 p-4 whitespace-pre-wrap">
                          {user.bio || <span className="text-gray-400 italic">No bio provided</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-600" />
                  {t('change_password')}
                </h3>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('current_password')}
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('new_password')}
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        minLength={6}
                        className="input-field"
                        placeholder="••••••••"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {locale === 'ar' ? '6 أحرف على الأقل' : locale === 'fr' ? 'Minimum 6 caractères' : 'Minimum 6 characters'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('confirm_password')}
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">
                    {locale === 'ar' ? 'انقر على "تعديل" لتغيير كلمة المرور' : 
                     locale === 'fr' ? "Cliquez sur 'Modifier' pour changer votre mot de passe" :
                     "Click 'Edit Profile' to change your password"}
                  </p>
                )}
              </div>

              {user.role === 'ADMIN' && isEditing && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    {t('admin_settings')}
                  </h3>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="text-sm text-purple-800">
                      {locale === 'ar' ? 'كمشرف، يمكنك إدارة المستخدمين والطلبات من لوحة التحكم' : 
                       locale === 'fr' ? "En tant qu'administrateur, vous pouvez gérer les utilisateurs et les demandes depuis le panneau d'administration" :
                       "As an admin, you can manage users and demands from the admin panel"}
                    </p>
                    <LocalizedLink
                      href="/admin"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
                    >
                      <Shield className="w-4 h-4" />
                      {tNav('adminPanel')}
                    </LocalizedLink>
                  </div>
                </div>
              )}

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

              {isEditing && (
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{locale === 'ar' ? 'جاري الحفظ...' : locale === 'fr' ? 'Enregistrement...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>{t('save')}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            {t('help')}{' '}
            <a href="/contact" className="text-blue-600 hover:underline">
              {t('contact_support')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}