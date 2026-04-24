// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

function jsonResponse(data: any, status: number = 200) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST() {
  try {
    await deleteSession();
    return jsonResponse({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    return jsonResponse(
      {
        success: false,
        error: 'Failed to logout',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      500
    );
  }
}
