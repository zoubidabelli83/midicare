// components/ReviewForm.tsx
'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { X, Loader2, Star } from 'lucide-react';
import ReviewStars from './ReviewStars';

interface ReviewFormProps {
  revieweeId: string;
  revieweeName: string;
  demandId?: string;
  applicationId?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ReviewForm({
  revieweeId,
  revieweeName,
  demandId,
  applicationId,
  onSuccess,
  onClose,
}: ReviewFormProps) {
  const t = useTranslations('reviews');
  const locale = useLocale();
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment,
          revieweeId,
          demandId,
          applicationId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to submit review');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{t('write_review')}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reviewee Info */}
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            {locale === 'ar' ? 'مراجعة:' : locale === 'fr' ? 'Avis pour:' : 'Reviewing:'}
          </p>
          <p className="font-semibold text-gray-900">{revieweeName}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('rating')} <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center py-2">
              <ReviewStars
                rating={rating}
                interactive={true}
                onChange={setRating}
                size="lg"
              />
            </div>
            <p className="text-center text-sm text-gray-500 mt-1">
              {rating > 0 && (
                <>
                  {rating === 1 && (locale === 'ar' ? 'سيء جداً' : locale === 'fr' ? 'Très mauvais' : 'Very Poor')}
                  {rating === 2 && (locale === 'ar' ? 'سيء' : locale === 'fr' ? 'Mauvais' : 'Poor')}
                  {rating === 3 && (locale === 'ar' ? 'متوسط' : locale === 'fr' ? 'Moyen' : 'Average')}
                  {rating === 4 && (locale === 'ar' ? 'جيد' : locale === 'fr' ? 'Bon' : 'Good')}
                  {rating === 5 && (locale === 'ar' ? 'ممتاز' : locale === 'fr' ? 'Excellent' : 'Excellent')}
                </>
              )}
            </p>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('comment')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder={t('comment_placeholder')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              {comment.length}/500
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              {locale === 'ar' ? 'إلغاء' : locale === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{locale === 'ar' ? 'جاري الإرسال...' : locale === 'fr' ? 'Envoi...' : 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  <span>{t('submit_review')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}