// components/DemandCard.tsx
'use client';

import { useTranslations, useLocale } from 'next-intl';
import { MapPin, Phone, Navigation, Clock, User, X, CheckCircle } from 'lucide-react';
import { LocalizedLink } from '@/lib/navigation';

interface DemandCardProps {
  demand: {
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
      avatarUrl?: string | null;
      lat: number | null;
      lng: number | null;
    };
    _count?: { applications: number };
  };
  showActions?: boolean;
  onApply?: (demandId: string, title: string) => void;
  onClose?: (demandId: string) => void;
}

export default function DemandCard({ 
  demand, 
  showActions = true, 
  onApply,
  onClose 
}: DemandCardProps) {
  const t = useTranslations('actions');
  const tDashboard = useTranslations('dashboard');
  const locale = useLocale();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(date);
  };

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${demand.lat},${demand.lng}`;
  const seekerMapsUrl = demand.seeker.lat && demand.seeker.lng 
    ? `https://www.google.com/maps/dir/?api=1&destination=${demand.seeker.lat},${demand.seeker.lng}`
    : null;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
              {demand.seeker.avatarUrl ? (
              <div className="relative w-12 h-12 overflow-hidden rounded-full border-2 border-blue-500">
                <img
                  src={demand.seeker.avatarUrl}
                  alt={demand.seeker.name}
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
            <h3 className="font-semibold text-gray-900">{demand.seeker.name}</h3>
            <p className="text-sm text-gray-500">{formatDate(demand.createdAt)}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          demand.status === 'OPEN' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {demand.status === 'OPEN' ? tDashboard('status_open') : tDashboard('status_closed')}
        </span>
      </div>

      {/* ✅ Clickable Title - Links to Demand Detail Page */}
      <LocalizedLink 
        href={`/demand/${demand.id}`}
        className="block hover:underline"
      >
        <h4 className="text-lg font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
          {demand.title}
        </h4>
      </LocalizedLink>
      
      <p className="text-gray-600 mb-4 line-clamp-3">{demand.description}</p>

      {/* Location */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <span>{demand.lat.toFixed(4)}, {demand.lng.toFixed(4)}</span>
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${demand.lat},${demand.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline ml-1"
        >
          ({locale === 'ar' ? 'عرض على الخريطة' : locale === 'fr' ? 'Voir sur la carte' : 'View on map'})
        </a>
      </div>

      {/* Stats */}
      {demand._count?.applications !== undefined && (
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 pb-4 border-b">
          <span className="flex items-center gap-1">
            <User className="w-4 h-4" />
            {demand._count.applications} {locale === 'ar' ? 'طلبات' : locale === 'fr' ? 'candidatures' : 'applications'}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && demand.status === 'OPEN' && (
        <div className="flex flex-wrap gap-2">
          {/* Call Now Button */}
          <a
            href={`tel:${demand.seeker.phone}`}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            aria-label={`${t('call_now')}: ${demand.seeker.phone}`}
          >
            <Phone className="w-4 h-4" />
            {t('call_now')}
          </a>

          {/* Get Directions Button */}
          {seekerMapsUrl && (
            <a
              href={seekerMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Navigation className="w-4 h-4" />
              {t('directions')}
            </a>
          )}

          {/* Apply Button (for providers) */}
          {onApply && (
            <button
              onClick={() => onApply(demand.id, demand.title)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <User className="w-4 h-4" />
              {locale === 'ar' ? 'تقديم طلب' : locale === 'fr' ? 'Postuler' : 'Apply'}
            </button>
          )}

          {/* Close Demand (for seeker) */}
          {onClose && (
            <button
              onClick={() => onClose(demand.id)}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <Clock className="w-4 h-4" />
              {t('close_demand')}
            </button>
          )}

          {/* ✅ View Details Button - Links to Demand Detail Page */}
          <LocalizedLink
            href={`/demand/${demand.id}`}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Navigation className="w-4 h-4" />
            {locale === 'ar' ? 'عرض التفاصيل' : locale === 'fr' ? 'Voir les détails' : 'View Details'}
          </LocalizedLink>
        </div>
      )}

      {/* Closed Status */}
      {demand.status === 'CLOSED' && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-500 italic">
            {locale === 'ar' ? 'تم إغلاق هذا الطلب' : locale === 'fr' ? 'Cette demande est fermée' : 'This demand is closed'}
          </p>
          {/* ✅ View Details Button for Closed Demands */}
          <LocalizedLink
            href={`/demand/${demand.id}`}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Navigation className="w-4 h-4" />
            {locale === 'ar' ? 'عرض التفاصيل' : locale === 'fr' ? 'Voir les détails' : 'View Details'}
          </LocalizedLink>
        </div>
      )}
    </div>
  );
}