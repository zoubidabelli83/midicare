// app/api/application/route.ts
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

export async function GET(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [APPLICATION API ${requestId}] GET request`);

  try {
    const session = await getSession();
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const { searchParams } = new URL(request.url);
    const demandId = searchParams.get('demandId');
    const providerId = searchParams.get('providerId');
    const status = searchParams.get('status') as 'PENDING' | 'ACCEPTED' | 'REJECTED' | undefined;

    const where: any = {};
    if (demandId) where.demandId = demandId;
    if (providerId) where.providerId = providerId;
    if (status) where.status = status;

    if (session.role === 'PROVIDER') {
      where.providerId = session.userId;
    } else if (session.role === 'SEEKER') {
      const userDemands = await prisma.demand.findMany({
        where: { seekerId: session.userId },
        select: { id: true },
      });
      const demandIds = userDemands.map(d => d.id);
      if (demandIds.length > 0) {
        where.demandId = { in: demandIds };
      } else {
        return jsonResponse({ success: true, applications: [], count: 0 });
      }
    }
    // ADMINS: No filter - can see ALL applications

    const applications = await prisma.application.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            lat: true,
            lng: true,
            isVerified: true,
            role: true,
            // ✅ Include provider details for seeker view
            hourlyRate: true,
            yearsExperience: true,
            specialties: true,
            certifications: true,
            bio: true,
            serviceRadius: true,
          },
        },
        demand: {
          select: {
            id: true,
            title: true,
            description: true,
            lat: true,
            lng: true,
            status: true,
            seekerId: true,
            seeker: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return jsonResponse({
      success: true,
      applications,
      count: applications.length,
      filters: { demandId, providerId, status },
    });

  } catch (error: any) {
    console.error(`💥 [APPLICATION API ${requestId}] GET error:`, error);
    return jsonResponse(
      { success: false, error: 'Failed to fetch applications', details: process.env.NODE_ENV === 'development' ? error?.message : undefined },
      500
    );
  }
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [APPLICATION API ${requestId}] POST request`);

  try {
    const session = await getSession();
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    if (session.role !== 'PROVIDER') {
      return jsonResponse({ success: false, error: 'Only care providers can apply to demands' }, 403);
    }

    const provider = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isVerified: true, status: true, name: true },
    });

    if (!provider?.isVerified || provider.status !== 'ACTIVE') {
      return jsonResponse({ success: false, error: 'Account not verified' }, 403);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request body' }, 400);
    }

    const { demandId, message } = body;

    if (!demandId || typeof demandId !== 'string') {
      return jsonResponse({ success: false, error: 'Missing required field: demandId' }, 400);
    }

    if (!message || typeof message !== 'string') {
      return jsonResponse({ success: false, error: 'Missing required field: message' }, 400);
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 10) {
      return jsonResponse({ success: false, error: 'Message must be at least 10 characters' }, 400);
    }
    if (trimmedMessage.length > 1000) {
      return jsonResponse({ success: false, error: 'Message must be less than 1000 characters' }, 400);
    }

    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      select: { status: true, seekerId: true, title: true },
    });

    if (!demand) {
      return jsonResponse({ success: false, error: 'Demand not found' }, 404);
    }

    if (demand.status !== 'OPEN') {
      return jsonResponse({ success: false, error: 'This demand is not accepting applications' }, 400);
    }

    if (demand.seekerId === session.userId) {
      return jsonResponse({ success: false, error: 'You cannot apply to your own demands' }, 400);
    }

    const existing = await prisma.application.findFirst({
      where: { demandId, providerId: session.userId },
    });

    if (existing) {
      return jsonResponse({ success: false, error: 'You have already applied to this demand' }, 409);
    }

    const application = await prisma.application.create({
      data: {
        message: trimmedMessage,
        providerId: session.userId,
        demandId,
        status: 'PENDING',
      },
      include: {
        provider: { select: { name: true, phone: true, avatarUrl: true } },
        demand: { 
          select: { 
            title: true, 
            seekerId: true,
            seeker: { select: { name: true, phone: true } }
          } 
        },
      },
    });

    return jsonResponse({ success: true, message: 'Application sent successfully!', application }, 201);

  } catch (error: any) {
    console.error(`💥 [APPLICATION API ${requestId}] POST error:`, error);
    return jsonResponse({ success: false, error: 'Failed to submit application', details: process.env.NODE_ENV === 'development' ? error?.message : undefined }, 500);
  }
}

export async function PATCH(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [APPLICATION API ${requestId}] PATCH request`);

  try {
    const session = await getSession();
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request body' }, 400);
    }

    const { applicationId, status } = body;

    if (!applicationId || typeof applicationId !== 'string') {
      return jsonResponse({ success: false, error: 'Missing required field: applicationId' }, 400);
    }

    if (!status || !['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return jsonResponse({ success: false, error: 'Status must be PENDING, ACCEPTED, or REJECTED' }, 400);
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { demand: { select: { seekerId: true } } },
    });

    if (!application) {
      return jsonResponse({ success: false, error: 'Application not found' }, 404);
    }

    // Allow ADMIN or the SEEKER who posted the demand to update
    if (session.role !== 'ADMIN' && application.demand.seekerId !== session.userId) {
      return jsonResponse({ success: false, error: 'Unauthorized: You can only manage applications to your demands' }, 403);
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status },
      include: {
        provider: { 
          select: { 
            name: true, 
            phone: true,
            hourlyRate: true,
            yearsExperience: true,
            specialties: true,
            certifications: true,
            bio: true,
            serviceRadius: true,
          } 
        },
        demand: { 
          select: { 
            title: true,
            seeker: { select: { name: true, phone: true } }
          } 
        },
      },
    });

    return jsonResponse({ success: true, message: `Application ${status.toLowerCase()}`, application: updated });

  } catch (error: any) {
    console.error(`💥 [APPLICATION API ${requestId}] PATCH error:`, error);
    return jsonResponse({ success: false, error: 'Failed to update application', details: process.env.NODE_ENV === 'development' ? error?.message : undefined }, 500);
  }
}

export async function PUT() {
  return jsonResponse({ error: 'Method not allowed. Use GET, POST, or PATCH.' }, 405);
}
export async function DELETE() {
  return jsonResponse({ error: 'Method not allowed.' }, 405);
}