// app/api/application/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';


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

function mapApplicationRow(row: any) {
  const providerRow = pickFirst(row.User);
  const demandRow = pickFirst(row.Demand);
  const seekerRow = demandRow ? pickFirst(demandRow.User) : null;

  return {
    id: row.id,
    message: row.message,
    status: row.status,
    providerId: row.providerId,
    demandId: row.demandId,
    createdAt: row.createdAt,
    provider: providerRow
      ? {
          id: providerRow.id,
          name: providerRow.name,
          email: providerRow.email,
          phone: providerRow.phone,
          avatarUrl: providerRow.avatarUrl,
          lat: providerRow.lat,
          lng: providerRow.lng,
          isVerified: providerRow.isVerified,
          role: providerRow.role,
          hourlyRate: providerRow.hourlyRate,
          yearsExperience: providerRow.yearsExperience,
          specialties: providerRow.specialties,
          certifications: providerRow.certifications,
          bio: providerRow.bio,
          serviceRadius: providerRow.serviceRadius,
        }
      : null,
    demand: demandRow
      ? {
          id: demandRow.id,
          title: demandRow.title,
          description: demandRow.description,
          lat: demandRow.lat,
          lng: demandRow.lng,
          status: demandRow.status,
          seekerId: demandRow.seekerId,
          seeker: seekerRow
            ? {
                id: seekerRow.id,
                name: seekerRow.name,
                phone: seekerRow.phone,
                email: seekerRow.email,
                avatarUrl: seekerRow.avatarUrl,
              }
            : null,
        }
      : null,
  };
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

    let query = supabaseAdmin
      .from('Application')
      .select(
        `
        id,message,status,providerId,demandId,createdAt,
        User:providerId(
          id,name,email,phone,avatarUrl,lat,lng,isVerified,role,
          hourlyRate,yearsExperience,specialties,certifications,bio,serviceRadius
        ),
        Demand:demandId(
          id,title,description,lat,lng,status,seekerId,
          User:seekerId(id,name,phone,email,avatarUrl)
        )
      `
      )
      .order('createdAt', { ascending: false })
      .limit(100);

    if (demandId) query = query.eq('demandId', demandId);
    if (providerId) query = query.eq('providerId', providerId);
    if (status) query = query.eq('status', status);

    if (session.role === 'PROVIDER') {
      query = query.eq('providerId', session.userId);
    } else if (session.role === 'SEEKER') {
      const { data: userDemands, error: demandsError } = await supabaseAdmin
        .from('Demand')
        .select('id')
        .eq('seekerId', session.userId);

      if (demandsError) throw new Error(demandsError.message);

      const demandIds = (userDemands || []).map((d: any) => d.id);
      if (demandIds.length === 0) {
        return jsonResponse({ success: true, applications: [], count: 0 });
      }

      query = query.in('demandId', demandIds);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const applications = (data || []).map(mapApplicationRow);

    return jsonResponse({
      success: true,
      applications,
      count: applications.length,
      filters: { demandId, providerId, status },
    });
  } catch (error: any) {
    console.error(`💥 [APPLICATION API ${requestId}] GET error:`, error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to fetch applications',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
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

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('User')
      .select('isVerified,status,name')
      .eq('id', session.userId)
      .single();

    if (providerError || !provider?.isVerified || provider.status !== 'ACTIVE') {
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

    const { data: demand, error: demandError } = await supabaseAdmin
      .from('Demand')
      .select('id,status,seekerId,title')
      .eq('id', demandId)
      .single();

    if (demandError || !demand) {
      return jsonResponse({ success: false, error: 'Demand not found' }, 404);
    }

    if (demand.status !== 'OPEN') {
      return jsonResponse({ success: false, error: 'This demand is not accepting applications' }, 400);
    }

    if (demand.seekerId === session.userId) {
      return jsonResponse({ success: false, error: 'You cannot apply to your own demands' }, 400);
    }

    const { data: existing } = await supabaseAdmin
      .from('Application')
      .select('id')
      .eq('demandId', demandId)
      .eq('providerId', session.userId)
      .limit(1);

    if (existing && existing.length > 0) {
      return jsonResponse({ success: false, error: 'You have already applied to this demand' }, 409);
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('Application')
      .insert({
        id: randomUUID(),  // ✅ Generate unique text ID
        message: trimmedMessage,
        providerId: session.userId,
        demandId,
        status: 'PENDING',
      })
      .select(
        `
        id,message,status,providerId,demandId,createdAt,
        User:providerId(name,phone,avatarUrl),
        Demand:demandId(
          title,seekerId,
          User:seekerId(name,phone)
        )
      `
      )
      .single();

    if (insertError || !inserted) {
      throw new Error(insertError?.message || 'Failed to create application');
    }

    const providerRow = pickFirst(inserted.User);
    const demandRow = pickFirst(inserted.Demand);
    const seekerRow = demandRow ? pickFirst(demandRow.User) : null;

    return jsonResponse(
      {
        success: true,
        message: 'Application sent successfully!',
        application: {
          id: inserted.id,
          message: inserted.message,
          status: inserted.status,
          providerId: inserted.providerId,
          demandId: inserted.demandId,
          createdAt: inserted.createdAt,
          provider: providerRow
            ? {
                name: providerRow.name,
                phone: providerRow.phone,
                avatarUrl: providerRow.avatarUrl,
              }
            : null,
          demand: demandRow
            ? {
                title: demandRow.title,
                seekerId: demandRow.seekerId,
                seeker: seekerRow
                  ? {
                      name: seekerRow.name,
                      phone: seekerRow.phone,
                    }
                  : null,
              }
            : null,
        },
      },
      201
    );
  } catch (error: any) {
    console.error(`💥 [APPLICATION API ${requestId}] POST error:`, error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to submit application',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
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

    const { data: application, error: appError } = await supabaseAdmin
      .from('Application')
      .select('id,demandId,Demand:demandId(seekerId)')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return jsonResponse({ success: false, error: 'Application not found' }, 404);
    }

    const demandRow = pickFirst(application.Demand);

    if (session.role !== 'ADMIN' && demandRow?.seekerId !== session.userId) {
      return jsonResponse(
        { success: false, error: 'Unauthorized: You can only manage applications to your demands' },
        403
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('Application')
      .update({ status })
      .eq('id', applicationId)
      .select(
        `
        id,message,status,providerId,demandId,createdAt,
        User:providerId(
          name,phone,hourlyRate,yearsExperience,specialties,certifications,bio,serviceRadius
        ),
        Demand:demandId(
          title,
          User:seekerId(name,phone)
        )
      `
      )
      .single();

    if (updateError || !updated) {
      throw new Error(updateError?.message || 'Failed to update application');
    }

    const updatedProvider = pickFirst(updated.User);
    const updatedDemand = pickFirst(updated.Demand);
    const updatedSeeker = updatedDemand ? pickFirst(updatedDemand.User) : null;

    return jsonResponse({
      success: true,
      message: `Application ${status.toLowerCase()}`,
      application: {
        id: updated.id,
        message: updated.message,
        status: updated.status,
        providerId: updated.providerId,
        demandId: updated.demandId,
        createdAt: updated.createdAt,
        provider: updatedProvider
          ? {
              name: updatedProvider.name,
              phone: updatedProvider.phone,
              hourlyRate: updatedProvider.hourlyRate,
              yearsExperience: updatedProvider.yearsExperience,
              specialties: updatedProvider.specialties,
              certifications: updatedProvider.certifications,
              bio: updatedProvider.bio,
              serviceRadius: updatedProvider.serviceRadius,
            }
          : null,
        demand: updatedDemand
          ? {
              title: updatedDemand.title,
              seeker: updatedSeeker
                ? { name: updatedSeeker.name, phone: updatedSeeker.phone }
                : null,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error(`💥 [APPLICATION API ${requestId}] PATCH error:`, error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to update application',
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
  return jsonResponse({ error: 'Method not allowed.' }, 405);
}
