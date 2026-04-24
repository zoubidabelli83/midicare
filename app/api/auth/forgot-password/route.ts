// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request format' }, 400);
    }

    const email = String(body?.email || '').trim().toLowerCase();
    const locale = String(body?.locale || 'en');
    if (!email) {
      return jsonResponse({ success: false, error: 'Valid email is required' }, 400);
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const redirectTo = `${baseUrl}/${locale}/login`;

    // security: always return generic success even if email doesn't exist
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      console.warn('Forgot password warning:', error.message);
    }

    return jsonResponse({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error: any) {
    console.error('Forgot Password API error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to process request. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}
