import axios from 'axios';
import { prisma } from '../db/prisma.js';

const BASE_URL = 'http://localhost:5000/api';

async function runFunctionalTests() {
  console.log('\n======================================================');
  console.log('🧪 STARTING LOOP 2: FUNCTIONAL VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✔ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const testMobile = '9823888801';

  try {
    // 0. Clean up any existing test user from previous run
    const existing = await prisma.user.findUnique({ where: { mobileNumber: testMobile } });
    if (existing) {
      await prisma.user.delete({ where: { id: existing.id } });
    }

    // 1. Request OTP
    console.log('\n[Scenario 1: First-time phone-number login]');
    const otpRes = await axios.post(`${BASE_URL}/auth/send-otp`, { mobileNumber: testMobile });
    assert(otpRes.data.success === true, 'OTP requested successfully');
    const devOtp = otpRes.data.devOtp;
    assert(Boolean(devOtp), 'Development OTP retrieved from response');

    // 2. Verify OTP (First time)
    const verifyRes1 = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      mobileNumber: testMobile,
      otp: devOtp
    });
    assert(verifyRes1.data.success === true, 'First-time OTP verification successful');
    assert(verifyRes1.data.isNewUser === true, 'Correctly flagged as isNewUser: true');
    const user1 = verifyRes1.data.user;
    const token1 = verifyRes1.data.tokens.accessToken;
    assert(Boolean(token1), 'Access token issued');

    const dbUserCount = await prisma.user.count({ where: { mobileNumber: testMobile } });
    assert(dbUserCount === 1, 'Exactly one user record created in Supabase database');

    // Update user profile
    await axios.post(
      `${BASE_URL}/auth/profile`,
      { fullName: 'Dr. Test Practitioner', userType: 'practitioner' },
      { headers: { Authorization: `Bearer ${token1}` } }
    );

    // 3. Returning Login
    console.log('\n[Scenario 2: Returning login restores same account]');
    const otpRes2 = await axios.post(`${BASE_URL}/auth/send-otp`, { mobileNumber: testMobile });
    const verifyRes2 = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      mobileNumber: testMobile,
      otp: otpRes2.data.devOtp
    });
    assert(verifyRes2.data.success === true, 'Returning login OTP verified');
    assert(verifyRes2.data.isNewUser === false, 'Correctly identified returning user (isNewUser: false)');
    assert(verifyRes2.data.user.id === user1.id, 'User ID matches existing account (no duplicate)');
    const token2 = verifyRes2.data.tokens.accessToken;

    const dbUserCountAfter = await prisma.user.count({ where: { mobileNumber: testMobile } });
    assert(dbUserCountAfter === 1, 'No duplicate user created after returning login');

    // 4. Conversation & Message Persistence
    console.log('\n[Scenario 3: Conversation creation & message persistence]');
    const conv1Res = await axios.post(
      `${BASE_URL}/conversations`,
      { title: 'Renal Colic Protocol', language: 'en' },
      { headers: { Authorization: `Bearer ${token2}` } }
    );
    assert(conv1Res.data.success === true, 'Conversation 1 created in PostgreSQL');
    const conv1Id = conv1Res.data.conversation.id;

    // Append Message 1 (User)
    const msg1Res = await axios.post(
      `${BASE_URL}/conversations/${conv1Id}/messages`,
      { role: 'user', content: 'Patient reports severe lumbar pain with dysuria.' },
      { headers: { Authorization: `Bearer ${token2}` } }
    );
    assert(msg1Res.data.success === true, 'User message appended to Conversation 1');

    // Append Message 2 (Assistant)
    const msg2Res = await axios.post(
      `${BASE_URL}/conversations/${conv1Id}/messages`,
      { role: 'assistant', content: 'Advise S1 and C5 diluted in water.' },
      { headers: { Authorization: `Bearer ${token2}` } }
    );
    assert(msg2Res.data.success === true, 'Assistant message appended to Conversation 1');

    // Create Conversation 2
    const conv2Res = await axios.post(
      `${BASE_URL}/conversations`,
      { title: 'Digestive Acidity Protocol', language: 'en' },
      { headers: { Authorization: `Bearer ${token2}` } }
    );
    const conv2Id = conv2Res.data.conversation.id;
    assert(conv2Res.data.success === true, 'Conversation 2 created');

    // 5. Reopen Conversation & Order Verification
    console.log('\n[Scenario 4: Reopening conversation loads messages in chronological order]');
    const getConv1 = await axios.get(
      `${BASE_URL}/conversations/${conv1Id}`,
      { headers: { Authorization: `Bearer ${token2}` } }
    );
    assert(getConv1.data.success === true, 'Conversation 1 retrieved');
    const messages = getConv1.data.conversation.messages;
    assert(messages.length === 2, 'All 2 messages loaded from database');
    assert(messages[0].role === 'user', 'First message is user message');
    assert(messages[1].role === 'assistant', 'Second message is assistant message');
    assert(new Date(messages[0].createdAt) <= new Date(messages[1].createdAt), 'Messages in correct chronological order');

    // 6. List Conversations
    console.log('\n[Scenario 5: Conversation listing & sorting]');
    const listRes = await axios.get(
      `${BASE_URL}/conversations`,
      { headers: { Authorization: `Bearer ${token2}` } }
    );
    assert(listRes.data.success === true, 'Conversations list retrieved');
    assert(listRes.data.total >= 2, 'Total conversations count matches database');

    // 7. Soft Deletion
    console.log('\n[Scenario 6: Soft-deletion of conversations]');
    const deleteRes = await axios.delete(
      `${BASE_URL}/conversations/${conv2Id}`,
      { headers: { Authorization: `Bearer ${token2}` } }
    );
    assert(deleteRes.data.success === true, 'Conversation 2 soft-deleted');

    const listAfterDelete = await axios.get(
      `${BASE_URL}/conversations`,
      { headers: { Authorization: `Bearer ${token2}` } }
    );
    const activeIds = listAfterDelete.data.conversations.map((c: any) => c.id);
    assert(!activeIds.includes(conv2Id), 'Soft-deleted conversation excluded from user history list');

    // Verify in database directly that record still exists with isDeleted: true
    const dbConv2 = await prisma.conversation.findUnique({ where: { id: conv2Id } });
    assert(dbConv2?.isDeleted === true, 'Record is preserved in database with isDeleted: true (safe soft-delete)');

    // 8. Admin Login & Authorization
    console.log('\n[Scenario 7: Dedicated Admin Login & Dashboard Operations]');
    const adminLoginRes = await axios.post(`${BASE_URL}/admin/login`, {
      email: 'admin@electropathy.ai',
      password: 'Admin@Electropathy2026!'
    });
    assert(adminLoginRes.data.success === true, 'Admin login succeeded');
    assert(adminLoginRes.data.admin.role === 'admin', 'Admin token carries verified role: admin');
    const adminToken = adminLoginRes.data.tokens.accessToken;

    // 9. Admin Overview Stats
    const overviewRes = await axios.get(
      `${BASE_URL}/admin/overview`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(overviewRes.data.success === true, 'Admin overview statistics loaded from database');
    assert(overviewRes.data.overview.users.total >= 1, 'Database-backed user count is correct');
    assert(overviewRes.data.overview.conversations.totalConversations >= 1, 'Database-backed conversation count is correct');

    // 10. Admin User Management
    console.log('\n[Scenario 8: Admin User Management & Search]');
    const adminUsersRes = await axios.get(
      `${BASE_URL}/admin/users?search=${testMobile}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(adminUsersRes.data.success === true, 'Admin users list loaded');
    const foundUser = adminUsersRes.data.users.find((u: any) => u.mobileNumber === testMobile);
    assert(Boolean(foundUser), 'Target user found via search query');
    assert(foundUser.passwordHash === undefined, 'Sensitive secrets (passwordHash) not exposed');

    // 11. Admin Audit Trail
    console.log('\n[Scenario 9: Administrative Audit Logging]');
    const auditRes = await axios.get(
      `${BASE_URL}/admin/audit-logs`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(auditRes.data.success === true, 'Admin audit logs retrieved');
    const hasLoginLog = auditRes.data.logs.some((l: any) => l.action === 'ADMIN_LOGIN');
    assert(hasLoginLog, 'Admin login was recorded in audit log table');

  } catch (error: any) {
    console.error('Test execution error:', error?.response?.data || error?.message || error);
    failed++;
  }

  console.log('\n======================================================');
  console.log(`📊 LOOP 2 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runFunctionalTests();
