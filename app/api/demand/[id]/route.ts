// app/api/demand/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mapDemandRow(row: any) {
  const applicationsCount = Array.isArray(row.Application) ? row.Application.length : 0;
  const seeker = row.User
    ? {
        id: row.User.id,
        name: row.User.name,
        email: row.User.email,
        phone: row.User.phone,
        avatarUrl: row.User.avatarUrl,
        role: row.User.role,
        isVerified: row.User.isVerified,
      }
    : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
    seekerId: row.seekerId,
    createdAt: row.createdAt,
    seeker,
    _count: { applications: applicationsCount },
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const { id } = await params;

    const { data: demandRow, error } = await supabaseAdmin
      .from('Demand')
      .select(
        `
        id,title,description,lat,lng,status,seekerId,createdAt,
        User:seekerId(id,name,email,phone,avatarUrl,role,isVerified),
        Application(id)
      `
      )
      .eq('id', id)
      .single();

    if (error || !demandRow) {
      return jsonResponse({ success: false, error: 'Demand not found' }, 404);
    }

    const demand = mapDemandRow(demandRow);

    if (session.role === 'ADMIN') {
      return jsonResponse({ success: true, demand });
    }

    if (session.role === 'SEEKER' && demand.seekerId === session.userId) {
      return jsonResponse({ success: true, demand });
    }

    if (session.role === 'PROVIDER' && demand.status === 'OPEN') {
      return jsonResponse({ success: true, demand });
    }

    return jsonResponse({ success: false, error: 'Unauthorized' }, 403);
  } catch (error: any) {
    console.error('Demand detail API error:', error);
    return jsonResponse({ success: false, error: 'Failed to load demand' }, 500);
  }
}
