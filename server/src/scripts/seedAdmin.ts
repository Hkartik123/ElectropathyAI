import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { prisma } from '../db/prisma.js';

dotenv.config();

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@electropathy.ai').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const mobileNumber = process.env.ADMIN_MOBILE || '9999999999';
  const fullName = process.env.ADMIN_NAME || 'System Administrator';

  if (!password) {
    throw new Error('ADMIN_PASSWORD must be set in the server environment');
  }

  console.log(`\n--- Provisioning Administrator Account ---`);
  console.log(`Checking if admin exists with email: ${email}...`);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { mobileNumber },
        { role: 'admin' }
      ]
    }
  });

  const passwordHash = await bcrypt.hash(password, 10);

  if (existingAdmin) {
    console.log(`Existing account found (ID: ${existingAdmin.id}, Role: ${existingAdmin.role}).`);
    const updated = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        role: 'admin',
        email,
        passwordHash,
        isActive: true
      }
    });
    console.log(`✔ Admin credentials updated successfully for: ${updated.email}`);
  } else {
    const newAdmin = await prisma.user.create({
      data: {
        mobileNumber,
        email,
        fullName,
        passwordHash,
        role: 'admin',
        userType: 'practitioner',
        preferredLang: 'en',
        isActive: true
      }
    });
    console.log(`✔ New Administrator account created successfully!`);
    console.log(`   ID: ${newAdmin.id}`);
    console.log(`   Email: ${newAdmin.email}`);
    console.log(`   Role: ${newAdmin.role}`);
  }

  console.log(`-----------------------------------------\n`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', err);
  process.exit(1);
});
