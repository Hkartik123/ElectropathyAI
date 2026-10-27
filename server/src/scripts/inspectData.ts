import { prisma } from '../db/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, mobileNumber: true, fullName: true, role: true, userType: true, createdAt: true }
  });
  console.log('=== USERS (' + users.length + ') ===');
  console.log(JSON.stringify(users, null, 2));

  const convs = await prisma.conversation.findMany({
    select: {
      id: true,
      userId: true,
      title: true,
      isDeleted: true,
      createdAt: true,
      user: { select: { id: true, mobileNumber: true, fullName: true } },
      _count: { select: { messages: true } }
    }
  });
  console.log('=== CONVERSATIONS (' + convs.length + ') ===');
  console.log(JSON.stringify(convs, null, 2));

  const cases = await prisma.patientCase.findMany({
    select: {
      id: true,
      practitionerId: true,
      patientName: true,
      contactNumber: true,
      practitioner: { select: { id: true, mobileNumber: true, fullName: true } }
    }
  });
  console.log('=== PATIENT CASES (' + cases.length + ') ===');
  console.log(JSON.stringify(cases, null, 2));

  const messages = await prisma.message.findMany({
    take: 20,
    select: { id: true, conversationId: true, role: true, content: true, createdAt: true }
  });
  console.log('=== SAMPLE MESSAGES (' + messages.length + ') ===');
  console.log(JSON.stringify(messages, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
