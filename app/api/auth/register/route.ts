// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Helper function to always return JSON with proper headers
function jsonResponse(data: any, status: number) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  console.log('🔐 [REGISTER API] Received request');
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('📥 [REGISTER API] Parsed body:', {
        name: body?.name,
        email: body?.email,
        phone: body?.phone,
        role: body?.role,
        hasLocation: !!(body?.lat && body?.lng),
      });
    } catch (parseError) {
      console.error('❌ [REGISTER API] Failed to parse JSON:', parseError);
      return jsonResponse(
        { success: false, error: 'Invalid request body. Expected JSON.' },
        400
      );
    }

    const { name, email, password, phone, role, lat, lng, avatarUrl } = body;

    // Validate required fields
    const missingFields = [];
    if (!name?.trim()) missingFields.push('name');
    if (!email?.trim()) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!phone?.trim()) missingFields.push('phone');
    if (lat === undefined || lng === undefined) missingFields.push('location (lat/lng)');
    
    if (missingFields.length > 0) {
      console.warn('⚠️ [REGISTER API] Missing fields:', missingFields);
      return jsonResponse(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        400
      );
    }

    // Validate phone format (Algerian: 05XXXXXXXX, 06XXXXXXXX, 07XXXXXXXX)
    const phoneRegex = /^0[5-7]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      console.warn('⚠️ [REGISTER API] Invalid phone format:', phone);
      return jsonResponse(
        { 
          success: false, 
          error: 'Phone must be 10 digits (Algerian format: 05XXXXXXXX, 06XXXXXXXX, or 07XXXXXXXX)' 
        },
        400
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('⚠️ [REGISTER API] Invalid email format:', email);
      return jsonResponse(
        { success: false, error: 'Invalid email format' },
        400
      );
    }

    // Validate password length
    if (password.length < 6) {
      console.warn('⚠️ [REGISTER API] Password too short');
      return jsonResponse(
        { success: false, error: 'Password must be at least 6 characters' },
        400
      );
    }

    // Check if user already exists
    console.log('🔍 [REGISTER API] Checking for existing user:', email);
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (existingUser) {
      console.warn('⚠️ [REGISTER API] User already exists:', email);
      return jsonResponse(
        { success: false, error: 'An account with this email already exists' },
        409 // Conflict
      );
    }

    // Hash password
    console.log('🔐 [REGISTER API] Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with PENDING status
    console.log('✨ [REGISTER API] Creating user in database...');
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone: phone.trim(),
        role: role === 'PROVIDER' ? 'PROVIDER' : 'SEEKER', // Default to SEEKER
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        avatarUrl: avatarUrl || null,
        status: 'PENDING',
        isVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    console.log('✅ [REGISTER API] User created successfully:', {
      id: user.id,
      email: user.email,
      status: user.status,
    });

    return jsonResponse(
      { 
        success: true, 
        message: 'Registration successful. Awaiting admin verification.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        }
      },
      201 // Created
    );

  } catch (error: any) {
    // ✅ Comprehensive error logging
    console.error('💥 [REGISTER API] Unhandled error:', {
      message: error?.message || 'Unknown error',
      code: error?.code,
      meta: error?.meta,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    // ✅ Always return JSON, never HTML
    return jsonResponse(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? `Server error: ${error?.message || 'Unknown error'}`
          : 'Registration failed. Please try again later.'
      },
      500
    );
  }
}

// Handle unsupported HTTP methods
export async function GET() {
  return jsonResponse(
    { error: 'Method not allowed. Use POST to register.' },
    405 // Method Not Allowed
  );
}

export async function PUT() {
  return jsonResponse(
    { error: 'Method not allowed. Use POST to register.' },
    405
  );
}

export async function DELETE() {
  return jsonResponse(
    { error: 'Method not allowed. Use POST to register.' },
    405
  );
}