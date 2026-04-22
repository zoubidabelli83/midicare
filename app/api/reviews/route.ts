// app/api/reviews/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

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

// GET - Get reviews for a user, reviewer, OR platform stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reviewerId = searchParams.get('reviewerId');
    const platformStats = searchParams.get('platformStats');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Platform-wide stats (for admin dashboard)
    if (platformStats === 'true') {
      const session = await getSession();
      if (!session || session.role !== 'ADMIN') {
        return jsonResponse({ success: false, error: 'Admin access required' }, 403);
      }

      const [totalReviews, avgResult, topProviders] = await Promise.all([
        prisma.review.count(),
        prisma.review.aggregate({ _avg: { rating: true } }),
        prisma.user.findMany({
          where: { role: 'PROVIDER', totalReviews: { gt: 0 } },
          select: { id: true, name: true, averageRating: true, totalReviews: true },
          orderBy: { averageRating: 'desc' },
          take: 5,
        }),
      ]);

      return jsonResponse({
        success: true,
        platformStats: {
          totalReviews,
          averageRating: avgResult._avg.rating || 0,
          topProviders,
        },
      });
    }

    // Reviews given by a user (for seeker dashboard)
    if (reviewerId) {
      const reviews = await prisma.review.findMany({
        where: { reviewerId },
        include: {
          reviewee: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          demand: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return jsonResponse({
        success: true,
        reviews: reviews || [],
        count: reviews.length,
      });
    }

    // Reviews received by a user (for provider profile/dashboard)
    if (!userId) {
      return jsonResponse({ success: false, error: 'userId or reviewerId required' }, 400);
    }

    const reviews = await prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
          },
        },
        demand: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const avgResult = await prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    if (avgResult._avg.rating !== null) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          averageRating: avgResult._avg.rating,
          totalReviews: avgResult._count.rating,
        },
      });
    }

    return jsonResponse({
      success: true,
      reviews: reviews || [],
      averageRating: avgResult._avg.rating || 0,
      totalReviews: avgResult._count.rating || 0,
    });

  } catch (error: any) {
    console.error('Reviews GET error:', error);
    return jsonResponse(
      { 
        success: false, 
        error: 'Failed to fetch reviews',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined 
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

    const existingReview = await prisma.review.findFirst({
      where: {
        reviewerId: session.userId,
        OR: [
          { applicationId: applicationId || undefined },
          { demandId: demandId || undefined },
        ],
      },
    });

    if (existingReview) {
      return jsonResponse({ success: false, error: 'You have already submitted a review' }, 409);
    }

    // ✅ CORRECTED: Proper Prisma create() syntax
    const review = await prisma.review.create({
      data: {
        rating: rating,
        comment: comment?.trim() || null,
        reviewerId: session.userId,
        revieweeId: revieweeId,
        demandId: demandId || null,
        applicationId: applicationId || null,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    const avgResult = await prisma.review.aggregate({
      where: { revieweeId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    // ✅ CORRECTED: Proper Prisma update() syntax
    await prisma.user.update({
      where: { id: revieweeId },
      data: {
        averageRating: avgResult._avg.rating || 0,
        totalReviews: avgResult._count.rating || 0,
      },
    });

    return jsonResponse({ success: true, review }, 201);

  } catch (error: any) {
    console.error('Reviews POST error:', error);
    return jsonResponse(
      { 
        success: false, 
        error: 'Failed to create review',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined 
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

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return jsonResponse({ success: true, message: 'Review deleted' });

  } catch (error: any) {
    console.error('Reviews DELETE error:', error);
    return jsonResponse(
      { 
        success: false, 
        error: 'Failed to delete review',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined 
      }, 
      500
    );
  }
}