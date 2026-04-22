// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    console.log('📥 Login API - Request received');
    
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    console.log('📧 Login attempt for:', email);

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Find user (case-insensitive email lookup)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isVerified: true,
        status: true,
        avatarUrl: true,
        phone: true,
      },
    });

    // User not found
    if (!user) {
      console.log('❌ User not found:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔍 User status check:', {
      email: user.email,
      isVerified: user.isVerified,
      status: user.status,
      role: user.role,
    });

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Password verified for:', email);

    // ✅ Check if account is verified AND active
    if (!user.isVerified) {
      console.log('❌ Account not verified:', email);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account not verified. Please wait for admin approval.' 
        },
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (user.status !== 'ACTIVE') {
      console.log('❌ Account not active:', email, '- status:', user.status);
      return NextResponse.json(
        { 
          success: false, 
          error: `Account is ${user.status.toLowerCase()}. Please contact support.` 
        },
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Account verified and active:', email);

    // ✅ Create proper JWT session using helper
    console.log('🍪 Creating JWT session for:', user.email);
    await createSession(user.id, user.email, user.role);
    console.log('✅ JWT session created successfully');

    // Return user data (without password)
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        status: user.status,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
      },
    }, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Login API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Login failed. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}