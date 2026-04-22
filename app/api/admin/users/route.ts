// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    const users = await prisma.user.findMany({
      where: {
        role: { in: ['SEEKER', 'PROVIDER'] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isVerified: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        hourlyRate: true,
        yearsExperience: true,
        specialties: true,
        certifications: true,
        bio: true,
        serviceRadius: true,
        averageRating: true,
        totalReviews: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return jsonResponse({
      success: true,
      users: Array.isArray(users) ? users : [],
      count: users?.length || 0,
    });

  } catch (error: any) {
    console.error('Admin users API error:', error);
    return jsonResponse(
      { 
        success: false, 
        error: 'Failed to fetch users',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined 
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

    // ✅ Build update data based on action
    const updateData: any = {};
    
    if (action === 'verify') {
      updateData.isVerified = true;
      // ✅ Also set status to ACTIVE when verifying
      if (updateData.status !== 'BANNED') {
        updateData.status = 'ACTIVE';
      }
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

    // ✅ Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        status: true,
      },
    });

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
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined 
      }, 
      500
    );
  }
}