import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export type AppRole = 'ADMIN' | 'SEEKER' | 'PROVIDER';

export interface AppSession {
  userId: string;
  email: string;
  role: AppRole;
  isVerified: boolean;
  status: 'PENDING' | 'ACTIVE' | 'BANNED';
}

const ACCESS_COOKIE = 'sb-access-token';
const REFRESH_COOKIE = 'sb-refresh-token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value || null;
}

export async function getSession(): Promise<AppSession | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) return null;

    // Role is stored in app profile table "User"
    const { data: profile } = await supabaseAdmin
      .from('User')
      .select('id,email,role,isVerified,status')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      userId: profile.id as string,
      email: profile.email as string,
      role: (profile.role as AppRole) || 'SEEKER',
      isVerified: Boolean((profile as any).isVerified),
      status: (((profile as any).status as 'PENDING' | 'ACTIVE' | 'BANNED') || 'PENDING'),
    };
  } catch {
    return null;
  }
}

export async function createSession(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete('session'); // cleanup legacy cookie
}
