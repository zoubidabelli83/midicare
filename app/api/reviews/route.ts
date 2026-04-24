// app/api/reviews/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

// GET - Get reviews for a user, reviewer, OR platform stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reviewerId = searchParams.get('reviewerId');
    const platformStats = searchParams.get('platformStats');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (platformStats === 'true') {
      const session = await getSession();
      if (!session || session.role !== 'ADMIN') {
        return jsonResponse({ success: false, error: 'Admin access required' }, 403);
      }

      const [{ count: totalReviews }, { data: allRatings }, { data: topProviders }] = await Promise.all([
        supabaseAdmin.from('Review').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('Review').select('rating'),
        supabaseAdmin
          .from('User')
          .select('id,name,averageRating,totalReviews')
          .eq('role', 'PROVIDER')
          .gt('totalReviews', 0)
          .order('averageRating', { ascending: false })
          .limit(5),
      ]);

      const ratings = allRatings || [];
      const avg =
        ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / ratings.length
          : 0;

      return jsonResponse({
        success: true,
        platformStats: {
          totalReviews: totalReviews || 0,
          averageRating: avg || 0,
          topProviders: topProviders || [],
        },
      });
    }

    if (reviewerId) {
      const { data: reviews, error } = await supabaseAdmin
        .from('Review')
        .select(
          `
          id,rating,comment,reviewerId,revieweeId,demandId,applicationId,createdAt,updatedAt,
          User!Review_revieweeId_fkey(id,name,avatarUrl,role),
          Demand(id,title)
        `
        )
        .eq('reviewerId', reviewerId)
        .order('createdAt', { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      return jsonResponse({
        success: true,
        reviews:
          (reviews || []).map((r: any) => ({
            ...r,
            reviewee: pickFirst(r.User),
            demand: pickFirst(r.Demand),
          })) || [],
        count: reviews?.length || 0,
      });
    }

    if (!userId) {
      return jsonResponse({ success: false, error: 'userId or reviewerId required' }, 400);
    }

    const { data: reviews, error } = await supabaseAdmin
      .from('Review')
      .select(
        `
        id,rating,comment,reviewerId,revieweeId,demandId,applicationId,createdAt,updatedAt,
        User!Review_reviewerId_fkey(id,name,avatarUrl,role),
        Demand(id,title)
      `
      )
      .eq('revieweeId', userId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    const { data: allReviewRatings, error: aggError } = await supabaseAdmin
      .from('Review')
      .select('rating')
      .eq('revieweeId', userId);

    if (aggError) throw new Error(aggError.message);

    const ratings = allReviewRatings || [];
    const totalReviews = ratings.length;
    const averageRating =
      totalReviews > 0
        ? ratings.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / totalReviews
        : 0;

    await supabaseAdmin
      .from('User')
      .update({
        averageRating,
        totalReviews,
      })
      .eq('id', userId);

    return jsonResponse({
      success: true,
      reviews:
        (reviews || []).map((r: any) => ({
          ...r,
          reviewer: pickFirst(r.User),
          demand: pickFirst(r.Demand),
        })) || [],
      averageRating,
      totalReviews,
    });
  } catch (error: any) {
    console.error('Reviews GET error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to fetch reviews',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

// POST - Create a new review
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await request.json();
    const { rating, comment, revieweeId, demandId, applicationId } = body;

    if (!rating || rating < 1 || rating > 5) {
      return jsonResponse({ success: false, error: 'Rating must be between 1 and 5' }, 400);
    }

    if (!revieweeId) {
      return jsonResponse({ success: false, error: 'revieweeId required' }, 400);
    }

    let duplicateQuery = supabaseAdmin.from('Review').select('id').eq('reviewerId', session.userId);

    if (applicationId) {
      duplicateQuery = duplicateQuery.eq('applicationId', applicationId);
    } else if (demandId) {
      duplicateQuery = duplicateQuery.eq('demandId', demandId);
    }

    const { data: existingReview } = await duplicateQuery.limit(1);

    if (existingReview && existingReview.length > 0) {
      return jsonResponse({ success: false, error: 'You have already submitted a review' }, 409);
    }

    const { data: review, error: createError } = await supabaseAdmin
      .from('Review')
      .insert({
        id: randomUUID(),
        rating,
        comment: comment?.trim() || null,
        reviewerId: session.userId,
        revieweeId,
        demandId: demandId || null,
        applicationId: applicationId || null,
        updatedAt: new Date().toISOString(),
      })
      .select(
        `
        id,rating,comment,reviewerId,revieweeId,demandId,applicationId,createdAt,updatedAt,
        User!Review_reviewerId_fkey(id,name,avatarUrl,role)
      `
      )
      .single();

      

    if (createError || !review) throw new Error(createError?.message || 'Failed to create review');

    const { data: allReviewRatings } = await supabaseAdmin
      .from('Review')
      .select('rating')
      .eq('revieweeId', revieweeId);

    const ratings = allReviewRatings || [];
    const totalReviews = ratings.length;
    const averageRating =
      totalReviews > 0
        ? ratings.reduce((sum: number, r: any) => sum + Number(r.rating || 0), 0) / totalReviews
        : 0;

    await supabaseAdmin
      .from('User')
      .update({
        averageRating,
        totalReviews,
      })
      .eq('id', revieweeId);

    return jsonResponse(
      {
        success: true,
        review: {
          ...review,
          reviewer: pickFirst((review as any).User),
        },
      },
      201
    );
  } catch (error: any) {
    console.error('Reviews POST error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to create review',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

// DELETE - Delete a review (admin only)
export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return jsonResponse({ success: false, error: 'Admin access required' }, 403);
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    if (!reviewId) {
      return jsonResponse({ success: false, error: 'reviewId required' }, 400);
    }

    const { error } = await supabaseAdmin.from('Review').delete().eq('id', reviewId);
    if (error) throw new Error(error.message);

    return jsonResponse({ success: true, message: 'Review deleted' });
  } catch (error: any) {
    console.error('Reviews DELETE error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to delete review',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}
