// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // ✅ Use the getSession() helper from lib/auth.ts
    // This properly handles both JWT and JSON sessions
    const session = await getSession();
    
    if (!session || !session.userId) {
      return NextResponse.json({ user: null }, { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        status: true,
        avatarUrl: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return NextResponse.json({
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

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json({ user: null }, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST() {
  const response = NextResponse.json({ success: true }, {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Use cookies() from next/headers for deletion
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  cookieStore.delete('session');
  
  return response;
}