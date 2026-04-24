// app/api/profile/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET() {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const session = await getSession();
    if (!session?.userId) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please log in.' }, 401);
    }

    const { data: user, error } = await supabaseAdmin
      .from('User')
      .select(
        'id,email,name,phone,role,isVerified,status,avatarUrl,lat,lng,hourlyRate,yearsExperience,specialties,availability,certifications,bio,serviceRadius,createdAt'
      )
      .eq('id', session.userId)
      .single();

    if (error || !user) {
      return jsonResponse({ success: false, error: 'User not found' }, 404);
    }

    return jsonResponse({ success: true, user });
  } catch (error: any) {
    console.error(`💥 [PROFILE API ${requestId}] GET error:`, error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to fetch profile',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

export async function PATCH(request: Request) {
  const requestId = Math.random().toString(36).substring(7);

  try {
    const session = await getSession();
    if (!session?.userId) {
      return jsonResponse({ success: false, error: 'Unauthorized. Please log in.' }, 401);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid request body. Expected JSON.' }, 400);
    }

    const {
      name,
      phone,
      avatarUrl,
      hourlyRate,
      yearsExperience,
      specialties,
      serviceRadius,
      certifications,
      bio,
      currentPassword,
      newPassword,
    } = body;

    const updates: any = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2 || trimmed.length > 100) {
        return jsonResponse({ success: false, error: 'Name must be between 2 and 100 characters' }, 400);
      }
      updates.name = trimmed;
    }

    if (phone !== undefined) {
      const trimmedPhone = String(phone).trim();
      const phoneRegex = /^0[5-7]\d{8}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        return jsonResponse(
          { success: false, error: 'Phone must be 10 digits (Algerian format: 05XXXXXXXX)' },
          400
        );
      }
      updates.phone = trimmedPhone;
    }

    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    if (session.role === 'PROVIDER') {
      if (hourlyRate !== undefined) {
        const rate = parseFloat(hourlyRate);
        if (isNaN(rate) || rate < 0) {
          return jsonResponse({ success: false, error: 'Hourly rate must be a valid positive number' }, 400);
        }
        updates.hourlyRate = rate;
      }

      if (yearsExperience !== undefined) {
        const years = parseInt(yearsExperience);
        if (isNaN(years) || years < 0 || years > 50) {
          return jsonResponse({ success: false, error: 'Years of experience must be between 0 and 50' }, 400);
        }
        updates.yearsExperience = years;
      }

      if (specialties !== undefined) {
        const value = String(specialties).trim();
        if (value.length > 500) {
          return jsonResponse({ success: false, error: 'Specialties must be less than 500 characters' }, 400);
        }
        updates.specialties = value;
      }

      if (serviceRadius !== undefined) {
        const radius = parseFloat(serviceRadius);
        if (isNaN(radius) || radius < 1 || radius > 100) {
          return jsonResponse({ success: false, error: 'Service radius must be between 1 and 100 km' }, 400);
        }
        updates.serviceRadius = radius;
      }

      if (certifications !== undefined) {
        const value = String(certifications).trim();
        if (value.length > 500) {
          return jsonResponse({ success: false, error: 'Certifications must be less than 500 characters' }, 400);
        }
        updates.certifications = value;
      }

      if (bio !== undefined) {
        const value = String(bio).trim();
        if (value.length > 2000) {
          return jsonResponse({ success: false, error: 'Bio must be less than 2000 characters' }, 400);
        }
        updates.bio = value;
      }
    }

    // Password change via Supabase Auth
    if (newPassword) {
      if (!currentPassword) {
        return jsonResponse(
          { success: false, error: 'Current password is required to change password' },
          400
        );
      }
      if (String(newPassword).length < 6) {
        return jsonResponse({ success: false, error: 'New password must be at least 6 characters' }, 400);
      }

      const email = String(session.email || '').toLowerCase();
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password: String(currentPassword),
      });

      if (signInError) {
        return jsonResponse({ success: false, error: 'Current password is incorrect' }, 400);
      }

      const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(session.userId, {
        password: String(newPassword),
      });

      if (pwError) {
        return jsonResponse({ success: false, error: 'Failed to update password' }, 500);
      }
    }

    if (Object.keys(updates).length > 0) {
      const { data: updatedUser, error } = await supabaseAdmin
        .from('User')
        .update(updates)
        .eq('id', session.userId)
        .select(
          'id,email,name,phone,role,isVerified,status,avatarUrl,lat,lng,hourlyRate,yearsExperience,specialties,serviceRadius,certifications,bio,createdAt'
        )
        .single();

      if (error || !updatedUser) {
        throw new Error(error?.message || 'Failed to update profile');
      }

      return jsonResponse({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    }

    const { data: user, error } = await supabaseAdmin
      .from('User')
      .select(
        'id,email,name,phone,role,isVerified,status,avatarUrl,lat,lng,hourlyRate,yearsExperience,specialties,serviceRadius,certifications,bio,createdAt'
      )
      .eq('id', session.userId)
      .single();

    if (error || !user) throw new Error(error?.message || 'Failed to fetch current profile');

    return jsonResponse({
      success: true,
      message: 'No changes to update',
      user,
    });
  } catch (error: any) {
    console.error(`💥 [PROFILE API ${requestId}] PATCH error:`, error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}

export async function POST() {
  return jsonResponse({ error: 'Method not allowed. Use GET or PATCH.' }, 405);
}
export async function PUT() {
  return jsonResponse({ error: 'Method not allowed. Use GET or PATCH.' }, 405);
}
export async function DELETE() {
  return jsonResponse({ error: 'Method not allowed.' }, 405);
}
