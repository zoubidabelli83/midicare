import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env BEFORE Prisma reads config
config({ path: resolve(process.cwd(), '.env') });

export default defineConfig({
  migrations: {
    seed: 'node --import tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
