// app/api/demand/route.ts
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
 * GET - List demands with filters
 * 
 * Query Parameters:
 * - status: Filter by demand status (OPEN | CLOSED)
 * - seekerId: Filter by specific seeker's demands
 * 
 * Access:
 * - SEEKERS: Can see their own demands
 * - PROVIDERS: Can see all OPEN demands
 * - ADMINS: Can see all demands
 */
export async function GET(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [DEMAND API ${requestId}] GET request received`);

  try {
    // 1. Get session
    const session = await getSession();
    if (!session) {
      console.warn(`⚠️ [DEMAND API ${requestId}] Unauthorized: No session`);
      return jsonResponse(
        { success: false, error: 'Unauthorized. Please log in.' },
        401
      );
    }

    console.log(`🔐 [DEMAND API ${requestId}] User: ${session.email} (${session.role})`);

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'OPEN' | 'CLOSED' | undefined;
    const seekerId = searchParams.get('seekerId') as string | undefined;

    // 3. Build where clause based on user role
    const where: any = {};

    if (session.role === 'SEEKER') {
      // Seekers can only see their own demands
      where.seekerId = session.userId;
      
      // Allow optional status filter
      if (status) {
        where.status = status;
      }
    } else if (session.role === 'PROVIDER') {
      // Providers can see all OPEN demands (for applying)
      where.status = 'OPEN';
      
      // Allow optional status override
      if (status) {
        where.status = status;
      }
    } else if (session.role === 'ADMIN') {
      // Admins can see all demands with optional filters
      if (status) {
        where.status = status;
      }
      if (seekerId) {
        where.seekerId = seekerId;
      }
    } else {
      console.warn(`⚠️ [DEMAND API ${requestId}] Invalid role: ${session.role}`);
      return jsonResponse(
        { success: false, error: 'Invalid user role' },
        403
      );
    }

    // 4. Fetch demands with related data
    console.log(`🔍 [DEMAND API ${requestId}] Fetching demands...`);
    
    const demands = await prisma.demand.findMany({
      where,
      include: {
        seeker: {
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
          },
        },
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit results for performance
    });

    console.log(`✅ [DEMAND API ${requestId}] Found ${demands.length} demands`);

    // 5. Return success response
    return jsonResponse({
      success: true,
      demands,
      count: demands.length,
      filters: { status, seekerId },
    });

  } catch (error: any) {
    console.error(`💥 [DEMAND API ${requestId}] GET error:`, {
      message: error?.message || 'Unknown error',
      code: error?.code,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    return jsonResponse(
      { 
        success: false, 
        error: 'Failed to fetch demands',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      500
    );
  }
}

/**
 * POST - Create new demand
 * 
 * Request Body:
 * - title: string (required, 5-100 chars)
 * - description: string (required, 10-1000 chars)
 * - lat: number (required)
 * - lng: number (required)
 * 
 * Access:
 * - Only verified SEEKERS can create demands
 * - User must have ACTIVE status
 */
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [DEMAND API ${requestId}] POST request received`);

  try {
    // 1. Get session
    const session = await getSession();
    if (!session) {
      console.warn(`⚠️ [DEMAND API ${requestId}] Unauthorized: No session`);
      return jsonResponse(
        { success: false, error: 'Unauthorized. Please log in.' },
        401
      );
    }

    console.log(`🔐 [DEMAND API ${requestId}] User: ${session.email} (${session.role})`);

    // 2. Check role - only SEEKERS can create demands
    if (session.role !== 'SEEKER') {
      console.warn(`⚠️ [DEMAND API ${requestId}] Forbidden: Role ${session.role} cannot create demands`);
      return jsonResponse(
        { success: false, error: 'Only care seekers can post demands' },
        403
      );
    }

    // 3. Check if seeker is verified and active
    const seeker = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isVerified: true, status: true, name: true },
    });

    if (!seeker?.isVerified || seeker.status !== 'ACTIVE') {
      console.warn(`⚠️ [DEMAND API ${requestId}] Seeker not verified or not active`);
      return jsonResponse(
        { success: false, error: 'Account not verified or not active. Please wait for admin approval.' },
        403
      );
    }

    // 4. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(`❌ [DEMAND API ${requestId}] Invalid JSON body`);
      return jsonResponse(
        { success: false, error: 'Invalid request body. Expected JSON.' },
        400
      );
    }

    const { title, description, lat, lng } = body;

    // Validate title
    if (!title || typeof title !== 'string') {
      return jsonResponse(
        { success: false, error: 'Missing required field: title' },
        400
      );
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 5) {
      return jsonResponse(
        { success: false, error: 'Title must be at least 5 characters long' },
        400
      );
    }

    if (trimmedTitle.length > 100) {
      return jsonResponse(
        { success: false, error: 'Title must be less than 100 characters' },
        400
      );
    }

    // Validate description
    if (!description || typeof description !== 'string') {
      return jsonResponse(
        { success: false, error: 'Missing required field: description' },
        400
      );
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10) {
      return jsonResponse(
        { success: false, error: 'Description must be at least 10 characters long' },
        400
      );
    }

    if (trimmedDescription.length > 1000) {
      return jsonResponse(
        { success: false, error: 'Description must be less than 1000 characters' },
        400
      );
    }

    // ✅ FIXED: Validate location with proper type checking
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      return jsonResponse(
        { success: false, error: 'Missing required fields: lat, lng' },
        400
      );
    }

    // ✅ FIXED: Type guard to ensure lat and lng are numbers
    const latNum = typeof lat === 'string' ? parseFloat(lat) : Number(lat);
    const lngNum = typeof lng === 'string' ? parseFloat(lng) : Number(lng);

    // Validate coordinates are numbers
    if (isNaN(latNum) || isNaN(lngNum)) {
      return jsonResponse(
        { success: false, error: 'Invalid coordinates. lat and lng must be numbers.' },
        400
      );
    }

    // Validate coordinates are within reasonable range (Algeria)
    if (latNum < 18 || latNum > 38 || lngNum < -9 || lngNum > 12) {
      return jsonResponse(
        { success: false, error: 'Invalid coordinates. Please select a location in Algeria.' },
        400
      );
    }

    console.log(`📝 [DEMAND API ${requestId}] Creating demand: ${trimmedTitle}`);

    // 5. Create demand
    const demand = await prisma.demand.create({
      data: {
        title: trimmedTitle,
        description: trimmedDescription,
        lat: latNum,  // ✅ No more red line - TypeScript knows this is a number
        lng: lngNum,  // ✅ No more red line - TypeScript knows this is a number
        seekerId: session.userId,
        status: 'OPEN',
      },
      include: {
        seeker: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
    });

    console.log(`✅ [DEMAND API ${requestId}] Demand created: ${demand.id}`);

    // 6. Return success response
    return jsonResponse(
      { 
        success: true, 
        message: 'Demand posted successfully!',
        demand,
      },
      201
    );

  } catch (error: any) {
    console.error(`💥 [DEMAND API ${requestId}] POST error:`, {
      message: error?.message || 'Unknown error',
      code: error?.code,
      meta: error?.meta,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    return jsonResponse(
      { 
        success: false, 
        error: 'Failed to create demand',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      500
    );
  }
}
/**
 * PATCH - Update demand status (close/open)
 * 
 * Request Body:
 * - demandId: string (required)
 * - status: 'OPEN' | 'CLOSED' (required)
 * 
 * Access:
 * - Only the SEEKER who posted the demand can update it
 * - ADMINS can update any demand
 */
export async function PATCH(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [DEMAND API ${requestId}] PATCH request received`);

  try {
    // 1. Get session
    const session = await getSession();
    if (!session) {
      console.warn(`⚠️ [DEMAND API ${requestId}] Unauthorized: No session`);
      return jsonResponse(
        { success: false, error: 'Unauthorized. Please log in.' },
        401
      );
    }

    console.log(`🔐 [DEMAND API ${requestId}] User: ${session.email} (${session.role})`);

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(`❌ [DEMAND API ${requestId}] Invalid JSON body`);
      return jsonResponse(
        { success: false, error: 'Invalid request body. Expected JSON.' },
        400
      );
    }

    const { demandId, status } = body;

    // Validate required fields
    if (!demandId || typeof demandId !== 'string') {
      console.warn(`⚠️ [DEMAND API ${requestId}] Missing or invalid demandId`);
      return jsonResponse(
        { success: false, error: 'Missing required field: demandId' },
        400
      );
    }

    if (!status || !['OPEN', 'CLOSED'].includes(status)) {
      console.warn(`⚠️ [DEMAND API ${requestId}] Invalid status: ${status}`);
      return jsonResponse(
        { success: false, error: 'Status must be OPEN or CLOSED' },
        400
      );
    }

    console.log(`📝 [DEMAND API ${requestId}] Updating demand ${demandId} to ${status}`);

    // 3. Get demand to verify ownership
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      select: { 
        seekerId: true,
        status: true,
        title: true,
        seeker: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!demand) {
      console.warn(`⚠️ [DEMAND API ${requestId}] Demand not found: ${demandId}`);
      return jsonResponse(
        { success: false, error: 'Demand not found' },
        404
      );
    }

    // 4. Check authorization (seeker who posted it OR admin)
    if (session.role !== 'ADMIN' && demand.seekerId !== session.userId) {
      console.warn(`⚠️ [DEMAND API ${requestId}] Unauthorized: User ${session.userId} cannot modify demand ${demandId}`);
      return jsonResponse(
        { success: false, error: 'Unauthorized: You can only modify your own demands' },
        403
      );
    }

    // 5. Check if status is actually changing
    if (demand.status === status) {
      console.log(`ℹ️ [DEMAND API ${requestId}] Status already ${status}, no update needed`);
      
      // Return current demand data
      const updatedDemand = await prisma.demand.findUnique({
        where: { id: demandId },
        include: {
          seeker: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: { applications: true },
          },
        },
      });

      return jsonResponse({
        success: true,
        message: `Demand is already ${status}`,
        demand: updatedDemand,
      });
    }

    // 6. Update demand status
    const updatedDemand = await prisma.demand.update({
      where: { id: demandId },
      data: { status: status as 'OPEN' | 'CLOSED' },
      include: {
        seeker: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: { applications: true },
        },
      },
    });

    console.log(`✅ [DEMAND API ${requestId}] Demand ${status.toLowerCase()}: ${demandId}`);

    // 7. Return success response
    return jsonResponse({
      success: true,
      message: `Demand ${status.toLowerCase()} successfully`,
      demand: updatedDemand,
    });

  } catch (error: any) {
    console.error(`💥 [DEMAND API ${requestId}] PATCH error:`, {
      message: error?.message || 'Unknown error',
      code: error?.code,
      meta: error?.meta,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    return jsonResponse(
      { 
        success: false, 
        error: 'Failed to update demand',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      500
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function PUT() {
  return jsonResponse(
    { error: 'Method not allowed. Use GET, POST, or PATCH.' },
    405
  );
}

export async function DELETE() {
  return jsonResponse(
    { error: 'Method not allowed. Demands cannot be deleted, only closed.' },
    405
  );
}

export async function HEAD() {
  return jsonResponse(
    { error: 'Method not allowed.' },
    405
  );
}

export async function OPTIONS() {
  return jsonResponse(
    { error: 'Method not allowed.' },
    405
  );
}