// app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';


// ✅ Helper to ensure proper JSON response
function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
  });
}

export async function POST(request: Request) {
  try {
    console.log('📥 Reset Password API - Request received');
    
    // ✅ Parse body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return jsonResponse(
        { success: false, error: 'Invalid request format' },
        400
      );
    }
    
    const { token, password, confirmPassword } = body;

    // Validate input
    if (!token || !password || !confirmPassword) {
      return jsonResponse(
        { success: false, error: 'All fields are required' },
        400
      );
    }

    if (password !== confirmPassword) {
      return jsonResponse(
        { success: false, error: 'Passwords do not match' },
        400
      );
    }

    if (password.length < 6) {
      return jsonResponse(
        { success: false, error: 'Password must be at least 6 characters' },
        400
      );
    }

    console.log('🔍 Validating reset token...');

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date(), // Token must not be expired
        },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      console.log('❌ Invalid or expired token');
      return jsonResponse({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset.',
      }, 400);
    }

    console.log('✅ Token valid for user:', user.email);

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('🔐 Password hashed');

    // Update password and CLEAR reset token (single-use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,      // ✅ Clear token after use
        resetTokenExpiry: null, // ✅ Clear expiry
      },
    });

    console.log('✅ Password updated successfully for:', user.email);

    // ✅ Return proper JSON response
    return jsonResponse({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });

  } catch (error: any) {
    console.error('💥 Reset Password API error:', error);
    
    // ✅ Always return JSON error response
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