// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@midicare.com' },
    update: {},
    create: {
      email: 'admin@midicare.com',
      password,
      name: 'Super Admin',
      phone: '0550000000',
      role: 'ADMIN',
      status: 'ACTIVE',
      isVerified: true,
    },
  });
  
  console.log('✅ Admin user created: admin@midicare.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });