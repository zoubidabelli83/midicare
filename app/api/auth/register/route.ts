// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

function jsonResponse(data: any, status: number) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function errorResponse(
  error: string,
  status: number,
  errorCode?: string,
  field?: string,
  extra?: Record<string, unknown>
) {
  return jsonResponse(
    {
      success: false,
      error,
      ...(errorCode ? { errorCode } : {}),
      ...(field ? { field } : {}),
      ...(extra || {}),
    },
    status
  );
}

export async function POST(request: Request) {
  console.log('🔐 [REGISTER API] Received request');

  try {
    let body;
    try {
      body = await request.json();
      console.log('📥 [REGISTER API] Parsed body:', {
        name: body?.name,
        email: body?.email,
        phone: body?.phone,
        role: body?.role,
        hasLocation: body?.lat !== undefined && body?.lng !== undefined,
      });
    } catch (parseError) {
      console.error('❌ [REGISTER API] Failed to parse JSON:', parseError);
      return errorResponse('Invalid request body. Expected JSON.', 400, 'INVALID_JSON');
    }

    const { name, email, password, phone, role, lat, lng, avatarUrl } = body;

    const missingFields = [];
    if (!name?.trim()) missingFields.push('name');
    if (!email?.trim()) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!phone?.trim()) missingFields.push('phone');
    if (lat === undefined || lng === undefined) missingFields.push('location (lat/lng)');

    if (missingFields.length > 0) {
      return errorResponse(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        'MISSING_FIELDS',
        undefined,
        { missingFields }
      );
    }

    const phoneRegex = /^0[5-7]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      return errorResponse(
        'Phone must be exactly 10 digits (Algerian format: 05XXXXXXXX, 06XXXXXXXX, or 07XXXXXXXX). Example: 0561234567',
        400,
        'INVALID_PHONE',
        'phone'
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format', 400, 'INVALID_EMAIL', 'email');
    }

    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters', 400, 'INVALID_PASSWORD', 'password');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1) Create auth user in Supabase Auth
    const { data: authUserData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        phone: phone.trim(),
        role: role === 'PROVIDER' ? 'PROVIDER' : 'SEEKER',
      },
    });

    if (authCreateError || !authUserData?.user) {
      const msg = authCreateError?.message?.toLowerCase() || '';
      if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        return errorResponse('An account with this email already exists', 409, 'USER_EXISTS', 'email');
      }
      return errorResponse(`Failed to create auth user: ${authCreateError?.message || 'Unknown error'}`, 500, 'AUTH_CREATE_FAILED');
    }

    const authUser = authUserData.user;
    const assignedRole = role === 'PROVIDER' ? 'PROVIDER' : 'SEEKER';

    // 2) Upsert into app profile table "User"
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from('User')
      .upsert(
        {
          id: authUser.id,
          email: normalizedEmail,
          password: hashedPassword,
          name: name.trim(),
          phone: phone.trim(),
          role: assignedRole,
          lat: Number(lat),
          lng: Number(lng),
          avatarUrl: avatarUrl || null,
          status: 'PENDING',
          isVerified: false,
        },
        { onConflict: 'id' }
      )
      .select('id,email,name,role,status')
      .single();

    if (profileError || !profileRow) {
      // rollback auth user to keep consistency
      await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      return errorResponse(
        `Failed to create user profile: ${profileError?.message || 'Unknown error'}`,
        500,
        'PROFILE_CREATE_FAILED'
      );
    }

    return jsonResponse(
      {
        success: true,
        message: 'Registration successful. Awaiting admin verification.',
        user: profileRow,
      },
      201
    );
  } catch (error: any) {
    console.error('💥 [REGISTER API] Unhandled error:', {
      message: error?.message || 'Unknown error',
      code: error?.code,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    return errorResponse(
      process.env.NODE_ENV === 'development'
        ? `Server error: ${error?.message || 'Unknown error'}`
        : 'Registration failed. Please try again later.',
      500,
      'INTERNAL_ERROR'
    );
  }
}

export async function GET() {
  return jsonResponse({ error: 'Method not allowed. Use POST to register.' }, 405);
}

export async function PUT() {
  return jsonResponse({ error: 'Method not allowed. Use POST to register.' }, 405);
}

export async function DELETE() {
  return jsonResponse({ error: 'Method not allowed. Use POST to register.' }, 405);
}
