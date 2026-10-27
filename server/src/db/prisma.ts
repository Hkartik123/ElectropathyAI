import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const { PrismaClient } = pkg;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Database connection URL missing in environment variables');
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
