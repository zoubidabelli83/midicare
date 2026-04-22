// components/ReviewCard.tsx
'use client';

import { useLocale } from 'next-intl';
import { User, Calendar } from 'lucide-react';
import ReviewStars from './ReviewStars';

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

interface ReviewCardProps {
  review: Review;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const locale = useLocale();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-DZ' : locale === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition bg-white">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {review.reviewer.avatarUrl ? (
            <img
              src={review.reviewer.avatarUrl}
              alt={review.reviewer.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-blue-500"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          )}
          <div>
            <h4 className="font-semibold text-gray-900">{review.reviewer.name}</h4>
            <p className="text-xs text-gray-500">
              {review.reviewer.role === 'SEEKER'
                ? locale === 'ar' ? 'باحث عن رعاية' : locale === 'fr' ? 'Demandeur de soins' : 'Care Seeker'
                : locale === 'ar' ? 'مقدم رعاية' : locale === 'fr' ? 'Prestataire de soins' : 'Care Provider'}
            </p>
          </div>
        </div>
        <ReviewStars rating={review.rating} size="sm" />
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-gray-700 text-sm mb-3 whitespace-pre-wrap">{review.comment}</p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(review.createdAt)}
        </span>
        {review.demand && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
            {review.demand.title}
          </span>
        )}
      </div>
    </div>
  );
}