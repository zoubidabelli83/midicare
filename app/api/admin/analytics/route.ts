// app/api/admin/analytics/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

/**
 * GET - Fetch admin analytics
 */
export async function GET() {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [ADMIN API ${requestId}] GET analytics request`);

  try {
    const session = await getSession();
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please log in.' }, 401);
    }

    if (session.role !== 'ADMIN') {
      return jsonResponse({ success: false, error: 'Admin access required' }, 403);
    }

    console.log(`🔐 [ADMIN API ${requestId}] Admin: ${session.email}`);

    const [
      totalUsersRes,
      verifiedUsersRes,
      pendingUsersRes,
      bannedUsersRes,
      totalDemandsRes,
      openDemandsRes,
      closedDemandsRes,
      totalApplicationsRes,
      pendingApplicationsRes,
      recentUsersRes,
      recentDemandsRes,
      recentApplicationsRes,
    ] = await Promise.all([
      supabaseAdmin.from('User').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('User').select('*', { count: 'exact', head: true }).eq('isVerified', true).eq('status', 'ACTIVE'),
      supabaseAdmin.from('User').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabaseAdmin.from('User').select('*', { count: 'exact', head: true }).eq('status', 'BANNED'),
      supabaseAdmin.from('Demand').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('Demand').select('*', { count: 'exact', head: true }).eq('status', 'OPEN'),
      supabaseAdmin.from('Demand').select('*', { count: 'exact', head: true }).eq('status', 'CLOSED'),
      supabaseAdmin.from('Application').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('Application').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      supabaseAdmin
        .from('User')
        .select('id,name,email,role,status,isVerified,createdAt')
        .order('createdAt', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('Demand')
        .select(
          `
          id,title,status,createdAt,
          User:seekerId(name),
          Application(id)
        `
        )
        .order('createdAt', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('Application')
        .select(
          `
          id,status,createdAt,
          User:providerId(name),
          Demand:demandId(title)
        `
        )
        .order('createdAt', { ascending: false })
        .limit(5),
    ]);

    const recentDemands = (recentDemandsRes.data || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      createdAt: d.createdAt,
      seeker: pickFirst(d.User) ? { name: pickFirst(d.User)?.name } : null,
      _count: { applications: Array.isArray(d.Application) ? d.Application.length : 0 },
    }));

    const recentApplications = (recentApplicationsRes.data || []).map((a: any) => ({
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      provider: pickFirst(a.User) ? { name: pickFirst(a.User)?.name } : null,
      demand: pickFirst(a.Demand) ? { title: pickFirst(a.Demand)?.title } : null,
    }));

    return jsonResponse({
      success: true,
      analytics: {
        users: {
          total: totalUsersRes.count || 0,
          verified: verifiedUsersRes.count || 0,
          pending: pendingUsersRes.count || 0,
          banned: bannedUsersRes.count || 0,
        },
        demands: {
          total: totalDemandsRes.count || 0,
          open: openDemandsRes.count || 0,
          closed: closedDemandsRes.count || 0,
        },
        applications: {
          total: totalApplicationsRes.count || 0,
          pending: pendingApplicationsRes.count || 0,
        },
        recent: {
          users: recentUsersRes.data || [],
          demands: recentDemands,
          applications: recentApplications,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`💥 [ADMIN API ${requestId}] Analytics error:`, {
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

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
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return jsonResponse({ success: false, error: 'Admin access required' }, 403);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request body' }, 400);
    }

    const { userId, action } = body;

    if (!userId || !['BAN', 'ACTIVATE', 'VERIFY'].includes(action)) {
      return jsonResponse({ success: false, error: 'Missing required fields: userId, action' }, 400);
    }

    if (userId === session.userId) {
      return jsonResponse({ success: false, error: 'Cannot modify your own admin account' }, 400);
    }

    let updateData: any = {};
    if (action === 'BAN') updateData = { status: 'BANNED', isVerified: false };
    else if (action === 'ACTIVATE') updateData = { status: 'ACTIVE', isVerified: true };
    else if (action === 'VERIFY') updateData = { isVerified: true, status: 'ACTIVE' };

    const { data: updatedUser, error } = await supabaseAdmin
      .from('User')
      .update(updateData)
      .eq('id', userId)
      .select('id,name,email,role,status,isVerified')
      .single();

    if (error || !updatedUser) throw new Error(error?.message || 'Failed to update user');

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
  return jsonResponse({ error: 'Method not allowed. Use GET or PATCH.' }, 405);
}

export async function PUT() {
  return jsonResponse({ error: 'Method not allowed. Use GET or PATCH.' }, 405);
}

export async function DELETE() {
  return jsonResponse({ error: 'Method not allowed.' }, 405);
}
