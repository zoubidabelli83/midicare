// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { getSession, deleteSession } from '@/lib/auth';

function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.userId) {
      return jsonResponse({ user: null }, 200);
    }

    return jsonResponse({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        isVerified: session.isVerified,
        status: session.status,
      },
    });
  } catch (error) {
    console.error('Session API error:', error);
    return jsonResponse({ user: null }, 200);
  }
}

export async function POST() {
  await deleteSession();
  return jsonResponse({ success: true });
}
