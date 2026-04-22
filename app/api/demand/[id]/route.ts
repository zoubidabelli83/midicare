// app/api/demand/[id]/route.ts
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

    const demand = await prisma.demand.findUnique({
      where: { id },
      include: {
        seeker: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            role: true,
            isVerified: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    if (!demand) {
      return jsonResponse({ success: false, error: 'Demand not found' }, 404);
    }

    // ✅ FIXED: Authorization checks
    // Admin can view all demands
    if (session.role === 'ADMIN') {
      return jsonResponse({ success: true, demand });
    }

    // Seeker can view their own demands
    if (session.role === 'SEEKER' && demand.seekerId === session.userId) {
      return jsonResponse({ success: true, demand });
    }

    // ✅ Provider can view OPEN demands (for applying)
    if (session.role === 'PROVIDER' && demand.status === 'OPEN') {
      return jsonResponse({ success: true, demand });
    }

    // All other cases: unauthorized
    return jsonResponse({ success: false, error: 'Unauthorized' }, 403);

  } catch (error: any) {
    console.error('Demand detail API error:', error);
    return jsonResponse({ success: false, error: 'Failed to load demand' }, 500);
  }
}