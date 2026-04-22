// app/api/profile/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const { id } = await params;

    // Only admins can view other users' profiles
    if (session.role !== 'ADMIN' && id !== session.userId) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isVerified: true,
        status: true,
        avatarUrl: true,
        lat: true,
        lng: true,
        hourlyRate: true,
        yearsExperience: true,
        specialties: true,
        serviceRadius: true,
        certifications: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      return jsonResponse({ success: false, error: 'User not found' }, 404);
    }

    return jsonResponse({ success: true, user });

  } catch (error: any) {
    console.error('Profile API error:', error);
    return jsonResponse({ success: false, error: 'Failed to load profile' }, 500);
  }
}