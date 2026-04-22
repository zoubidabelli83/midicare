// components/ProviderApplicationCard.tsx
'use client';

import { useTranslations } from 'next-intl';
import { MapPin, Phone, Navigation, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { LocalizedLink } from '@/lib/navigation';

interface ProviderApplication {
  id: string;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  demand: {
    id: string;
    title: string;
    description: string;
    lat: number;
    lng: number;
    status: 'OPEN' | 'CLOSED';
    seeker?: {
      id: string;
      name: string;
      phone: string;
    };
  };
}

interface ApplicationCardProps {
  application: ProviderApplication;
  locale: string;
  onViewDemand: () => void;
  onContactSeeker: () => void;
}

export default function ProviderApplicationCard({ 
  application, 
  locale, 
  onViewDemand, 
  onContactSeeker 
}: ApplicationCardProps) {
  const t = useTranslations('provider');
  const tActions = useTranslations('actions');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(date);
  };

  const statusConfig = {
    PENDING: {
      label: t('application_status_pending'),
      color: 'bg-yellow-100 text-yellow-800',
      icon: <Loader className="w-4 h-4 animate-spin" />
    },
    ACCEPTED: {
      label: t('application_status_accepted'),
      color: 'bg-green-100 text-green-800',
      icon: <CheckCircle className="w-4 h-4" />
    },
    REJECTED: {
      label: t('application_status_rejected'),
      color: 'bg-red-100 text-red-800',
      icon: <XCircle className="w-4 h-4" />
    }
  };

  const status = statusConfig[application.status];
  const seeker = application.demand?.seeker;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${application.demand.lat},${application.demand.lng}`;

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition bg-white">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        
        {/* Left: Application Info */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900 text-lg">{application.demand.title}</h4>
              <p className="text-sm text-gray-500">
                {locale === 'ar' ? 'بواسطة' : locale === 'fr' ? 'par' : 'by'} {seeker?.name || 'Unknown'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
              {status.icon}
              {status.label}
            </span>
          </div>

          {/* Message */}
          <p className="text-gray-700 mb-3 line-clamp-3">{application.message}</p>

          {/* Demand Location */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>{application.demand.lat.toFixed(4)}, {application.demand.lng.toFixed(4)}</span>
            <a 
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline ml-1"
            >
              ({locale === 'ar' ? 'عرض' : locale === 'fr' ? 'Voir' : 'View'})
            </a>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(application.createdAt)}
            </span>
            {application.demand.status === 'CLOSED' && (
              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                {locale === 'ar' ? 'مغلق' : locale === 'fr' ? 'Fermé' : 'Closed'}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-2 min-w-[140px]">
          {/* ✅ FIXED: View Demand - Now uses LocalizedLink */}
          <LocalizedLink
            href={`/demand/${application.demand.id}`}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
          >
            <Navigation className="w-4 h-4" />
            {t('view_demand_details')}
          </LocalizedLink>

          {/* Contact Seeker (only if accepted or pending) */}
          {application.status !== 'REJECTED' && seeker?.phone && (
            <button
              onClick={onContactSeeker}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              {tActions('call_now')}
            </button>
          )}

          {/* Rejected: Show note */}
          {application.status === 'REJECTED' && (
            <p className="text-xs text-red-600 text-center">
              {locale === 'ar' ? 'تم رفض هذا الطلب' : locale === 'fr' ? 'Candidature refusée' : 'Application declined'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}