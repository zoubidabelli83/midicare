// app/api/demand/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

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

function mapDemandRow(row: any) {
  const applicationsCount = Array.isArray(row.Application) ? row.Application.length : 0;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    seekerId: row.seekerId,
    createdAt: row.createdAt,
    seeker: row.User
      ? {
          id: row.User.id,
          name: row.User.name,
          email: row.User.email,
          phone: row.User.phone,
          avatarUrl: row.User.avatarUrl,
          lat: row.User.lat,
          lng: row.User.lng,
          isVerified: row.User.isVerified,
          role: row.User.role,
        }
      : null,
    _count: {
      applications: applicationsCount,
    },
  };
}

/**
 * GET - List demands with filters
 */
export async function GET(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [DEMAND API ${requestId}] GET request received`);

  try {
    const session = await getSession();
    if (!session) {
      console.warn(`⚠️ [DEMAND API ${requestId}] Unauthorized: No session`);
      return jsonResponse({ success: false, error: 'Unauthorized. Please log in.' }, 401);
    }

    console.log(`🔐 [DEMAND API ${requestId}] User: ${session.email} (${session.role})`);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'OPEN' | 'CLOSED' | undefined;
    const seekerId = searchParams.get('seekerId') as string | undefined;

    let query = supabaseAdmin
      .from('Demand')
      .select(
        `
        id,title,description,lat,lng,status,seekerId,createdAt,
        User:seekerId(id,name,email,phone,avatarUrl,lat,lng,isVerified,role),
        Application(id)
      `
      )
      .order('createdAt', { ascending: false })
      .limit(100);

    if (session.role === 'SEEKER') {
      query = query.eq('seekerId', session.userId);
      if (status) query = query.eq('status', status);
    } else if (session.role === 'PROVIDER') {
      query = query.eq('status', status || 'OPEN');
    } else if (session.role === 'ADMIN') {
      if (status) query = query.eq('status', status);
      if (seekerId) query = query.eq('seekerId', seekerId);
    } else {
      console.warn(`⚠️ [DEMAND API ${requestId}] Invalid role: ${session.role}`);
      return jsonResponse({ success: false, error: 'Invalid user role' }, 403);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    const demands = (data || []).map(mapDemandRow);

    console.log(`✅ [DEMAND API ${requestId}] Found ${demands.length} demands`);

    return jsonResponse({
      success: true,
      demands,
      count: demands.length,
      filters: { status, seekerId },
    });
  } catch (error: any) {
    console.error(`💥 [DEMAND API ${requestId}] GET error:`, {
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    return jsonResponse(
      {
        success: false,
        error: 'Failed to fetch demands',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

/**
 * POST - Create new demand
 */
export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [DEMAND API ${requestId}] POST request received`);

  try {
    const session = await getSession();
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please log in.' }, 401);
    }

    if (session.role !== 'SEEKER') {
      return jsonResponse({ success: false, error: 'Only care seekers can post demands' }, 403);
    }

    const { data: seeker, error: seekerError } = await supabaseAdmin
      .from('User')
      .select('isVerified,status,name')
      .eq('id', session.userId)
      .single();

    if (seekerError || !seeker?.isVerified || seeker.status !== 'ACTIVE') {
      return jsonResponse(
        { success: false, error: 'Account not verified or not active. Please wait for admin approval.' },
        403
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request body. Expected JSON.' }, 400);
    }

    const { title, description, lat, lng } = body;

    if (!title || typeof title !== 'string') {
      return jsonResponse({ success: false, error: 'Missing required field: title' }, 400);
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 5) {
      return jsonResponse({ success: false, error: 'Title must be at least 5 characters long' }, 400);
    }
    if (trimmedTitle.length > 100) {
      return jsonResponse({ success: false, error: 'Title must be less than 100 characters' }, 400);
    }

    if (!description || typeof description !== 'string') {
      return jsonResponse({ success: false, error: 'Missing required field: description' }, 400);
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 10) {
      return jsonResponse({ success: false, error: 'Description must be at least 10 characters long' }, 400);
    }
    if (trimmedDescription.length > 1000) {
      return jsonResponse({ success: false, error: 'Description must be less than 1000 characters' }, 400);
    }

    if (lat === undefined || lat === null || lng === undefined || lng === null) {
      return jsonResponse({ success: false, error: 'Missing required fields: lat, lng' }, 400);
    }

    const latNum = typeof lat === 'string' ? parseFloat(lat) : Number(lat);
    const lngNum = typeof lng === 'string' ? parseFloat(lng) : Number(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return jsonResponse({ success: false, error: 'Invalid coordinates. lat and lng must be numbers.' }, 400);
    }

    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return jsonResponse({ success: false, error: 'Invalid coordinates. Latitude must be -90..90 and longitude must be -180..180.' }, 400);
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('Demand')
      .insert({
        id: randomUUID(),  // ✅ Generate unique text ID
        title: trimmedTitle,
        description: trimmedDescription,
        lat: latNum,
        lng: lngNum,
        seekerId: session.userId,
        status: 'OPEN',
      })
      .select(
        `
        id,title,description,lat,lng,status,seekerId,createdAt,
        User:seekerId(id,name,email,phone,avatarUrl),
        Application(id)
      `
      )
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message || 'Failed to create demand');
    }

    const seekerRow = Array.isArray(inserted.User) ? inserted.User[0] : inserted.User;
    const demand = {
      ...mapDemandRow(inserted),
      seeker: seekerRow
        ? {
            id: seekerRow.id,
            name: seekerRow.name,
            email: seekerRow.email,
            phone: seekerRow.phone,
            avatarUrl: seekerRow.avatarUrl,
          }
        : null,
    };

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
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    return jsonResponse(
      {
        success: false,
        error: 'Failed to create demand',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

/**
 * PATCH - Update demand status (close/open)
 */
export async function PATCH(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [DEMAND API ${requestId}] PATCH request received`);

  try {
    const session = await getSession();
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please log in.' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request body. Expected JSON.' }, 400);
    }

    const { demandId, status } = body;

    if (!demandId || typeof demandId !== 'string') {
      return jsonResponse({ success: false, error: 'Missing required field: demandId' }, 400);
    }

    if (!status || !['OPEN', 'CLOSED'].includes(status)) {
      return jsonResponse({ success: false, error: 'Status must be OPEN or CLOSED' }, 400);
    }

    const { data: demand, error: demandError } = await supabaseAdmin
      .from('Demand')
      .select('id,seekerId,status,title')
      .eq('id', demandId)
      .single();

    if (demandError || !demand) {
      return jsonResponse({ success: false, error: 'Demand not found' }, 404);
    }

    if (session.role !== 'ADMIN' && demand.seekerId !== session.userId) {
      return jsonResponse(
        { success: false, error: 'Unauthorized: You can only modify your own demands' },
        403
      );
    }

    if (demand.status === status) {
      const { data: current } = await supabaseAdmin
        .from('Demand')
        .select(
          `
          id,title,description,lat,lng,status,seekerId,createdAt,
          User:seekerId(id,name,email,phone,avatarUrl),
          Application(id)
        `
        )
        .eq('id', demandId)
        .single();

      return jsonResponse({
        success: true,
        message: `Demand is already ${status}`,
        demand: current ? mapDemandRow(current) : null,
      });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('Demand')
      .update({ status })
      .eq('id', demandId)
      .select(
        `
        id,title,description,lat,lng,status,seekerId,createdAt,
        User:seekerId(id,name,email,phone,avatarUrl),
        Application(id)
      `
      )
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message || 'Failed to update demand');
    }

    return jsonResponse({
      success: true,
      message: `Demand ${status.toLowerCase()} successfully`,
      demand: mapDemandRow(updated),
    });
  } catch (error: any) {
    console.error(`💥 [DEMAND API ${requestId}] PATCH error:`, {
      message: error?.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    return jsonResponse(
      {
        success: false,
        error: 'Failed to update demand',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

export async function PUT() {
  return jsonResponse({ error: 'Method not allowed. Use GET, POST, or PATCH.' }, 405);
}

export async function DELETE() {
  return jsonResponse({ error: 'Method not allowed. Demands cannot be deleted, only closed.' }, 405);
}

export async function HEAD() {
  return jsonResponse({ error: 'Method not allowed.' }, 405);
}

export async function OPTIONS() {
  return jsonResponse({ error: 'Method not allowed.' }, 405);
}
