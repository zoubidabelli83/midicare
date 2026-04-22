// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail, createPasswordResetEmail } from '@/lib/email';
import crypto from 'crypto';

// ✅ Helper to ensure JSON response
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
    console.log('📥 Forgot Password API - Request received');
    
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
    
    const { email, locale = 'en' } = body;

    // Validate input
    if (!email || typeof email !== 'string') {
      return jsonResponse(
        { success: false, error: 'Valid email is required' },
        400
      );
    }

    console.log('📧 Password reset request for:', email);

    // Find user (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true },
    });

    // ✅ Security: Always return success to prevent email enumeration
    if (!user) {
      console.log('ℹ️ No account found for:', email, '(not revealing to user)');
      return jsonResponse({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetToken as string | null,
        rresetTokenExpiry: resetTokenExpiry as Date | null,
      } as any,
    });

    console.log('✅ Reset token created for user:', user.id);

    // Create reset URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/${locale}/reset-password/${resetToken}`;
    console.log('🔗 Reset URL:', resetUrl);

    // Create email content
    const emailData = createPasswordResetEmail(locale, resetUrl, user.name || user.email);

    // ✅ Send email with try-catch
    try {
      await sendEmail({
        to: user.email,
        subject: emailData.subject,
        html: emailData.html,
      });
      console.log('✅ Password reset email sent to:', user.email);
    } catch (emailError: any) {
      console.error('❌ Email send failed:', emailError);
      // ✅ Still return success to user (don't reveal email failure)
      // In production, you might want to queue emails or alert admins
    }

    // ✅ Always return success response
    return jsonResponse({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });

  } catch (error: any) {
    console.error('💥 Forgot Password API error:', error);
    
    // ✅ Always return JSON error response
    return jsonResponse(
      {
        success: false,
        error: 'Failed to process request. Please try again.',
        // Only include details in development
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}