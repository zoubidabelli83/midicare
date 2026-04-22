import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    select: { id: true, name: true, phone: true, role: true, status: true, isVerified: true, avatarUrl: true }
  });
  return NextResponse.json(users);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, action } = await req.json(); // action: 'VERIFY' | 'BAN'
  
  if (action === 'VERIFY') {
    await prisma.user.update({ where: { id: userId }, data: { isVerified: true, status: 'ACTIVE' } });
  } else if (action === 'BAN') {
    await prisma.user.update({ where: { id: userId }, data: { status: 'BANNED' } });
  }

  return NextResponse.json({ success: true });
}