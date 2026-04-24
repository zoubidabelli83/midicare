// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!email || !password) {
      return jsonResponse({ success: false, error: 'Email and password are required' }, 400);
    }

    // Sign in via Supabase Auth (source of truth for password)
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user || !authData?.session) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [LOGIN AUTH ERROR]', {
          message: authError?.message || null,
          status: (authError as any)?.status ?? null,
          code: (authError as any)?.code ?? null,
          name: (authError as any)?.name ?? null,
          email,
        });
      }
      return jsonResponse({ success: false, error: 'Invalid email or password' }, 401);
    }

    const authUserId = authData.user.id;
    const authEmail = String(authData.user.email || '').trim().toLowerCase();

    // Fetch app profile from "User" table only
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('User')
      .select('id,email,name,role,isVerified,status,avatarUrl,phone')
      .eq('id', authUserId)
      .maybeSingle();

    let matchedTable: 'User' | null = profile ? 'User' : null;

    if (!profile) {
      const { data: byEmail, error: byEmailError } = await supabaseAdmin
        .from('User')
        .select('id,email,name,role,isVerified,status,avatarUrl,phone')
        .eq('email', authEmail)
        .maybeSingle();

      profile = byEmail || null;
      profileError = byEmailError || profileError;
      if (profile) matchedTable = 'User';
    }

    if (!profile) {
      const { data: byEmailList, error: byEmailListError } = await supabaseAdmin
        .from('User')
        .select('id,email,name,role,isVerified,status,avatarUrl,phone')
        .ilike('email', authEmail)
        .limit(1);

      if (byEmailList && byEmailList.length > 0) {
        profile = byEmailList[0];
        matchedTable = 'User';
      }
      profileError = byEmailListError || profileError;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔎 [LOGIN DEBUG] Auth user:', { id: authUserId, email: authEmail });
      console.log('🔎 [LOGIN DEBUG] Profile lookup result:', {
        found: !!profile,
        matchedTable,
        profileId: profile?.id,
        profileEmail: profile?.email,
        lookupError: profileError?.message || null,
      });
    }

    if (profileError && !profile) {
      return jsonResponse({ success: false, error: 'User profile not found' }, 404);
    }

    if (!profile) {
      return jsonResponse({ success: false, error: 'User profile not found' }, 404);
    }

    if (!profile.isVerified) {
      return jsonResponse(
        { success: false, error: 'Account not verified. Please wait for admin approval.' },
        403
      );
    }

    if (profile.status !== 'ACTIVE') {
      return jsonResponse(
        { success: false, error: `Account is ${String(profile.status).toLowerCase()}. Please contact support.` },
        403
      );
    }

    await createSession(authData.session.access_token, authData.session.refresh_token);

    return jsonResponse({
      success: true,
      message: 'Login successful',
      user: profile,
    });
  } catch (error: any) {
    console.error('💥 Login API error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Login failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}
