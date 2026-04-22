// app/api/profile/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * Helper: Always return JSON with proper headers
 */
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

/**
 * GET - Fetch current user's profile
 */
export async function GET() {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [PROFILE API ${requestId}] GET request`);

  try {
    // 1. Get session
    const session = await getSession();
    if (!session?.userId) {
      console.warn(`⚠️ [PROFILE API ${requestId}] Unauthorized: No session`);
      return jsonResponse(
        { success: false, error: 'Unauthorized. Please log in.' },
        401
      );
    }

    console.log(`🔐 [PROFILE API ${requestId}] User: ${session.email}`);

    // 2. Fetch user profile (exclude password)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isVerified: true,
        status: true,
        avatarUrl: true,
        lat: true,
        lng: true,
        hourlyRate: true,
        yearsExperience: true,
        specialties: true,
        availability: true,
        certifications: true,
        bio: true,
        serviceRadius: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.warn(`⚠️ [PROFILE API ${requestId}] User not found: ${session.userId}`);
      return jsonResponse(
        { success: false, error: 'User not found' },
        404
      );
    }

    console.log(`✅ [PROFILE API ${requestId}] Profile fetched successfully`);

    return jsonResponse({
      success: true,
      user,
    });

  } catch (error: any) {
    console.error(`💥 [PROFILE API ${requestId}] GET error:`, {
      message: error?.message || 'Unknown error',
      code: error?.code,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    return jsonResponse(
      { 
        success: false, 
        error: 'Failed to fetch profile',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      500
    );
  }
}

/**
 * PATCH - Update current user's profile
 */
export async function PATCH(request: Request) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`📥 [PROFILE API ${requestId}] PATCH request`);

  try {
    // 1. Get session
    const session = await getSession();
    if (!session?.userId) {
      console.warn(`⚠️ [PROFILE API ${requestId}] Unauthorized: No session`);
      return jsonResponse(
        { success: false, error: 'Unauthorized. Please log in.' },
        401
      );
    }

    console.log(`🔐 [PROFILE API ${requestId}] User: ${session.email}`);

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error(`❌ [PROFILE API ${requestId}] Invalid JSON body`);
      return jsonResponse(
        { success: false, error: 'Invalid request body. Expected JSON.' },
        400
      );
    }

    const { 
      name, 
      phone, 
      avatarUrl, 
      currentPassword, 
      newPassword,
      // Provider-specific fields
      hourlyRate,
      yearsExperience,
      specialties,
      serviceRadius,
      certifications,
      bio,
    } = body;

    // 3. Validate inputs
    const updates: any = {};

    if (name) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return jsonResponse(
          { success: false, error: 'Name must be at least 2 characters' },
          400
        );
      }
      if (trimmedName.length > 100) {
        return jsonResponse(
          { success: false, error: 'Name must be less than 100 characters' },
          400
        );
      }
      updates.name = trimmedName;
    }

    if (phone) {
      const trimmedPhone = phone.trim();
      const phoneRegex = /^0[5-7]\d{8}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        return jsonResponse(
          { success: false, error: 'Phone must be 10 digits (Algerian format: 05XXXXXXXX)' },
          400
        );
      }
      updates.phone = trimmedPhone;
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl;
    }

    // 4. Handle provider-specific fields (only for PROVIDER role)
    if (session.role === 'PROVIDER') {
      if (hourlyRate !== undefined) {
        const rate = parseFloat(hourlyRate);
        if (isNaN(rate) || rate < 0) {
          return jsonResponse(
            { success: false, error: 'Hourly rate must be a valid positive number' },
            400
          );
        }
        updates.hourlyRate = rate;
      }

      if (yearsExperience !== undefined) {
        const years = parseInt(yearsExperience);
        if (isNaN(years) || years < 0 || years > 50) {
          return jsonResponse(
            { success: false, error: 'Years of experience must be between 0 and 50' },
            400
          );
        }
        updates.yearsExperience = years;
      }

      if (specialties !== undefined) {
        const specs = specialties.trim();
        if (specs.length > 500) {
          return jsonResponse(
            { success: false, error: 'Specialties must be less than 500 characters' },
            400
          );
        }
        updates.specialties = specs;
      }

      if (serviceRadius !== undefined) {
        const radius = parseFloat(serviceRadius);
        if (isNaN(radius) || radius < 1 || radius > 100) {
          return jsonResponse(
            { success: false, error: 'Service radius must be between 1 and 100 km' },
            400
          );
        }
        updates.serviceRadius = radius;
      }

      if (certifications !== undefined) {
        const certs = certifications.trim();
        if (certs.length > 500) {
          return jsonResponse(
            { success: false, error: 'Certifications must be less than 500 characters' },
            400
          );
        }
        updates.certifications = certs;
      }

      if (bio !== undefined) {
        const userBio = bio.trim();
        if (userBio.length > 2000) {
          return jsonResponse(
            { success: false, error: 'Bio must be less than 2000 characters' },
            400
          );
        }
        updates.bio = userBio;
      }
    }

    // 5. Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return jsonResponse(
          { success: false, error: 'Current password is required to change password' },
          400
        );
      }

      if (newPassword.length < 6) {
        return jsonResponse(
          { success: false, error: 'New password must be at least 6 characters' },
          400
        );
      }

      // Verify current password
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { password: true },
      });

      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return jsonResponse(
          { success: false, error: 'Current password is incorrect' },
          400
        );
      }

      // Hash and update new password
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    // 6. Update user if there are changes
    if (Object.keys(updates).length > 0) {
      console.log(`✨ [PROFILE API ${requestId}] Updating user:`, Object.keys(updates));
      
      const updatedUser = await prisma.user.update({
        where: { id: session.userId },
        data: updates,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isVerified: true,
          status: true,
          avatarUrl: true,
          lat: true,
          lng: true,
          hourlyRate: true,
          yearsExperience: true,
          specialties: true,
          serviceRadius: true,
          certifications: true,
          bio: true,
          createdAt: true,
        },
      });

      console.log(`✅ [PROFILE API ${requestId}] Profile updated successfully`);

      return jsonResponse({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    }

    // No changes to make
    console.log(`ℹ️ [PROFILE API ${requestId}] No updates provided`);
    
    // Return current user data
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isVerified: true,
        status: true,
        avatarUrl: true,
        lat: true,
        lng: true,
        hourlyRate: true,
        yearsExperience: true,
        specialties: true,
        serviceRadius: true,
        certifications: true,
        bio: true,
        createdAt: true,
      },
    });

    return jsonResponse({
      success: true,
      message: 'No changes to update',
      user,
    });

  } catch (error: any) {
    console.error(`💥 [PROFILE API ${requestId}] PATCH error:`, {
      message: error?.message || 'Unknown error',
      code: error?.code,
      meta: error?.meta,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    });

    return jsonResponse(
      { 
        success: false, 
        error: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      500
    );
  }
}

/**
 * Handle unsupported methods
 */
export async function POST() {
  return jsonResponse(
    { error: 'Method not allowed. Use GET or PATCH.' },
    405
  );
}

export async function PUT() {
  return jsonResponse(
    { error: 'Method not allowed. Use GET or PATCH.' },
    405
  );
}

export async function DELETE() {
  return jsonResponse(
    { error: 'Method not allowed.' },
    405
  );
}