// app/api/auth/reset-password/route.ts
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

/**
 * Expects:
 * {
 *   accessToken: string, // recovery access token from Supabase link/session
 *   password: string,
 *   confirmPassword: string
 * }
 */
export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request format' }, 400);
    }

    const accessToken = String(body?.accessToken || '');
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!accessToken || !password || !confirmPassword) {
      return jsonResponse({ success: false, error: 'All fields are required' }, 400);
    }

    if (password !== confirmPassword) {
      return jsonResponse({ success: false, error: 'Passwords do not match' }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ success: false, error: 'Password must be at least 6 characters' }, 400);
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return jsonResponse(
        { success: false, error: 'Invalid or expired reset token. Please request a new password reset.' },
        400
      );
    }

    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password }
    );

    if (updateError || !updateData?.user) {
      return jsonResponse({ success: false, error: 'Failed to reset password. Please try again.' }, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error: any) {
    console.error('Reset Password API error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to reset password. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}
