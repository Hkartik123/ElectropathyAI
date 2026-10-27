import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';

async function setExistingPasswords() {
  const defaultPassword = process.env.DEFAULT_USER_PASSWORD;
  if (!defaultPassword) {
    throw new Error('DEFAULT_USER_PASSWORD must be set in the server environment');
  }
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  console.log('🔄 Updating existing user accounts with the configured default password...');

  const users = await prisma.user.findMany({
    select: { id: true, mobileNumber: true, fullName: true, role: true, passwordHash: true }
  });

  console.log(`Found ${users.length} total user accounts in database.`);

  let updatedCount = 0;
  for (const user of users) {
    // Update password for all users or users without custom password
    // Keep existing admin password if it's the admin
    if (user.role === 'admin' && user.passwordHash) {
      console.log(`- Skipping admin user ${user.id} to preserve admin password.`);
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });
    console.log(`✔ Set Password@1234 for user ${user.mobileNumber} (${user.fullName || 'No Name'})`);
    updatedCount++;
  }

  console.log(`\n🎉 Successfully updated ${updatedCount} user account(s) to "Password@1234"!\n`);
  await prisma.$disconnect();
}

setExistingPasswords().catch((err) => {
  console.error('Error updating existing passwords:', err);
  process.exit(1);
});
