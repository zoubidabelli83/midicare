// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
    }

    // Try rich projection first; fallback to minimal projection when schema differs.
    let users: any[] | null = null;

    const fullSelect = await supabaseAdmin
      .from('User')
      .select(
        `
        id,email,name,phone,role,isVerified,status,avatarUrl,createdAt,
        hourlyRate,yearsExperience,specialties,certifications,bio,serviceRadius,
        averageRating,totalReviews
      `
      )
      .in('role', ['SEEKER', 'PROVIDER'])
      .order('createdAt', { ascending: false });

    if (fullSelect.error) {
      console.warn('Admin users full-select failed, using fallback select:', fullSelect.error.message);

      const fallback = await supabaseAdmin
        .from('User')
        .select('id,email,name,phone,role,isVerified,status,createdAt,avatarUrl')
        .in('role', ['SEEKER', 'PROVIDER'])
        .order('createdAt', { ascending: false });

      if (fallback.error) throw new Error(fallback.error.message);
      users = Array.isArray(fallback.data) ? fallback.data : [];
    } else {
      users = Array.isArray(fullSelect.data) ? fullSelect.data : [];
    }

    return jsonResponse({
      success: true,
      users,
      count: users.length,
    });
  } catch (error: any) {
    console.error('Admin users API error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to fetch users',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
    }

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !['verify', 'activate', 'ban', 'unban'].includes(action)) {
      return jsonResponse({ success: false, error: 'Invalid request' }, 400);
    }

    const updateData: any = {};

    if (action === 'verify') {
      updateData.isVerified = true;
      updateData.status = 'ACTIVE';
    }
    if (action === 'activate') {
      updateData.status = 'ACTIVE';
    }
    if (action === 'ban') {
      updateData.status = 'BANNED';
    }
    if (action === 'unban') {
      updateData.status = 'ACTIVE';
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('User')
      .update(updateData)
      .eq('id', userId)
      .select('id,email,name,role,isVerified,status')
      .single();

    if (error || !updatedUser) throw new Error(error?.message || 'Failed to update user');

    return jsonResponse({
      success: true,
      message: `User ${action === 'verify' ? 'verified' : action + 'ed'} successfully`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Admin update API error:', error);
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
