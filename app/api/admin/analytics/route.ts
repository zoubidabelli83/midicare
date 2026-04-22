// app/api/admin/analytics/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * Helper: Always return JSON with proper headers
 */
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

/**
 * GET - Fetch admin analytics
 */
export async function GET() {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [ADMIN API ${requestId}] GET analytics request`);

  try {
    // 1. Check session
    const session = await getSession();
    if (!session) {
      console.warn(`⚠️ [ADMIN API ${requestId}] Unauthorized: No session`);
      return jsonResponse(
        { success: false, error: 'Unauthorized. Please log in.' },
        401
      );
    }

    // 2. Check admin role
    if (session.role !== 'ADMIN') {
      console.warn(`⚠️ [ADMIN API ${requestId}] Forbidden: Role ${session.role}`);
      return jsonResponse(
        { success: false, error: 'Admin access required' },
        403
      );
    }

    console.log(`🔐 [ADMIN API ${requestId}] Admin: ${session.email}`);

    // 3. Fetch analytics data
    const [
      totalUsers,
      verifiedUsers,
      pendingUsers,
      bannedUsers,
      totalDemands,
      openDemands,
      closedDemands,
      totalApplications,
      pendingApplications,
      recentUsers,
      recentDemands,
      recentApplications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true, status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { status: 'BANNED' } }),
      prisma.demand.count(),
      prisma.demand.count({ where: { status: 'OPEN' } }),
      prisma.demand.count({ where: { status: 'CLOSED' } }),
      prisma.application.count(),
      prisma.application.count({ where: { status: 'PENDING' } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      prisma.demand.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          seeker: { select: { name: true } },
          _count: { select: { applications: true } },
        },
      }),
      prisma.application.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          provider: { select: { name: true } },
          demand: { select: { title: true } },
        },
      }),
    ]);

    console.log(`✅ [ADMIN API ${requestId}] Analytics fetched successfully`);

    return jsonResponse({
      success: true,
      analytics: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          pending: pendingUsers,
          banned: bannedUsers,
        },
        demands: {
          total: totalDemands,
          open: openDemands,
          closed: closedDemands,
        },
        applications: {
          total: totalApplications,
          pending: pendingApplications,
        },
        recent: {
          users: recentUsers,
          demands: recentDemands,
          applications: recentApplications,
        },
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error(`💥 [ADMIN API ${requestId}] Analytics error:`, {
      message: error?.message || 'Unknown error',
      code: error?.code,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    // ✅ ALWAYS return JSON, never HTML
    return jsonResponse(
      {
        success: false,
        error: 'Failed to fetch analytics',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

/**
 * PATCH - Update user status (ban/activate/verify)
 */
export async function PATCH(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [ADMIN API ${requestId}] PATCH user request`);

  try {
    // 1. Check session and role
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return jsonResponse(
        { success: false, error: 'Admin access required' },
        403
      );
    }

    // 2. Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { success: false, error: 'Invalid request body' },
        400
      );
    }

    const { userId, action } = body;

    if (!userId || !['BAN', 'ACTIVATE', 'VERIFY'].includes(action)) {
      return jsonResponse(
        { success: false, error: 'Missing required fields: userId, action' },
        400
      );
    }

    // 3. Prevent self-modification
    if (userId === session.userId) {
      return jsonResponse(
        { success: false, error: 'Cannot modify your own admin account' },
        400
      );
    }

    // 4. Prepare update data
    let updateData: any = {};
    if (action === 'BAN') {
      updateData = { status: 'BANNED', isVerified: false };
    } else if (action === 'ACTIVATE') {
      updateData = { status: 'ACTIVE', isVerified: true };
    } else if (action === 'VERIFY') {
      updateData = { isVerified: true, status: 'ACTIVE' };
    }

    // 5. Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      ...updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isVerified: true,
      },
    });

    console.log(`✅ [ADMIN API ${requestId}] User ${action}: ${updatedUser.email}`);

    return jsonResponse({
      success: true,
      message: `User ${action.toLowerCase()} successfully`,
      user: updatedUser,
    });

  } catch (error: any) {
    console.error(`💥 [ADMIN API ${requestId}] PATCH error:`, error);

    return jsonResponse(
      {
        success: false,
        error: 'Failed to update user',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

/**
 * Handle unsupported methods
 */
export async function POST() {
  return jsonResponse(
    { error: 'Method not allowed. Use GET or PATCH.' },
    405
  );
}

export async function PUT() {
  return jsonResponse(
    { error: 'Method not allowed. Use GET or PATCH.' },
    405
  );
}

export async function DELETE() {
  return jsonResponse(
    { error: 'Method not allowed.' },
    405
  );
}