// lib/auth.ts
import { jwtVerify, SignJWT, JWTPayload } from 'jose';
import { cookies } from 'next/headers';

// ✅ Use environment variable or fallback (must be 32+ chars)
const key = new TextEncoder().encode(
  process.env.JWT_SECRET || '962ce28d2465d1d2fbc88a3f333dd6c8b410cde84d369b5eb1c7171de2c45fd7'
);

export async function encrypt(payload: any): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function decrypt(input: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // ✅ Return null for invalid tokens - don't throw
    return null;
  }
}

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    
    if (!sessionCookie?.value) {
      return null;
    }

    const sessionValue = sessionCookie.value;
    
    // ✅ Step 1: Try to parse as JWT
    let parsed = await decrypt(sessionValue);
    
    // ✅ Step 2: If JWT failed (parsed is null), try plain JSON
    if (!parsed) {
      try {
        parsed = JSON.parse(sessionValue);
      } catch {
        return null;
      }
    }
    
    // ✅ Step 3: Validate required fields
    if (!parsed || typeof parsed !== 'object' || !('userId' in parsed)) {
      return null;
    }
    
    // ✅ Step 4: Check expiration if present
    if ('expiresAt' in parsed && typeof parsed.expiresAt === 'number') {
      if (Date.now() > parsed.expiresAt) {
        return null;
      }
    }
    
    return parsed as {
      userId: string;
      email: string;
      role: 'ADMIN' | 'SEEKER' | 'PROVIDER';
      expiresAt?: number;
      [key: string]: any;
    };
    
  } catch (error) {
    console.error('getSession error:', error);
    return null;
  }
}

export async function createSession(userId: string, email: string, role: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  const session = await encrypt({
    userId,
    email,
    role,
    expiresAt: expiresAt.getTime(),
  });

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return session;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}