// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { data: users, error } = await supabaseAdmin
      .from('User')
      .select('id,name,phone,role,status,isVerified,avatarUrl')
      .neq('role', 'ADMIN');

    if (error) throw new Error(error.message);

    return jsonResponse(Array.isArray(users) ? users : []);
  } catch (error: any) {
    return jsonResponse(
      {
        error: 'Failed to fetch users',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { userId, action } = await req.json();

    if (!userId || !action) {
      return jsonResponse({ error: 'Invalid request' }, 400);
    }

    if (action === 'VERIFY') {
      const { error } = await supabaseAdmin
        .from('User')
        .update({ isVerified: true, status: 'ACTIVE' })
        .eq('id', userId);
      if (error) throw new Error(error.message);
    } else if (action === 'BAN') {
      const { error } = await supabaseAdmin
        .from('User')
        .update({ status: 'BANNED' })
        .eq('id', userId);
      if (error) throw new Error(error.message);
    } else {
      return jsonResponse({ error: 'Unsupported action' }, 400);
    }

    return jsonResponse({ success: true });
  } catch (error: any) {
    return jsonResponse(
      {
        error: 'Failed to update user',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}
