/**
 * Loop 3: Security, Data Isolation & Edge Case Test Suite
 * Electropathy AI
 */
import axios from 'axios';
import { prisma } from '../db/prisma.js';

const BASE_URL = 'http://localhost:5000/api';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition: boolean, desc: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✔ [PASS] ${desc}`);
  } else {
    failedChecks++;
    console.error(`  ✖ [FAIL] ${desc}`);
  }
}

async function runSecurityTests() {
  console.log('\n======================================================');
  console.log('🛡️  STARTING LOOP 3: SECURITY & DATA ISOLATION TEST SUITE');
  console.log('======================================================\n');

  try {
    // ----------------------------------------------------
    // Scenario 1: Unauthenticated Requests (401 Unauthorized)
    // ----------------------------------------------------
    console.log('[Scenario 1: Unauthenticated requests rejected with 401]');

    try {
      await axios.get(`${BASE_URL}/conversations`);
      assert(false, 'GET /api/conversations should have failed without token');
    } catch (err: any) {
      assert(err.response?.status === 401, 'GET /api/conversations returns 401 for unauthenticated request');
    }

    try {
      await axios.get(`${BASE_URL}/admin/overview`);
      assert(false, 'GET /api/admin/overview should have failed without token');
    } catch (err: any) {
      assert(err.response?.status === 401, 'GET /api/admin/overview returns 401 for unauthenticated request');
    }

    try {
      await axios.get(`${BASE_URL}/admin/users`);
      assert(false, 'GET /api/admin/users should have failed without token');
    } catch (err: any) {
      assert(err.response?.status === 401, 'GET /api/admin/users returns 401 for unauthenticated request');
    }

    // ----------------------------------------------------
    // Setup Users: User A, User B, and Admin
    // ----------------------------------------------------
    console.log('\n[Setup: Creating test users User A and User B]');
    const mobileA = '+918000000001';
    const mobileB = '+918000000002';

    // Clean up test users first
    for (const m of [mobileA, mobileB]) {
      const existing = await prisma.user.findUnique({ where: { mobileNumber: m } });
      if (existing) {
        await prisma.conversation.deleteMany({ where: { userId: existing.id } });
        await prisma.refreshToken.deleteMany({ where: { userId: existing.id } });
        await prisma.otpVerification.deleteMany({ where: { mobileNumber: m } });
        await prisma.user.delete({ where: { id: existing.id } });
      }
    }

    // User A Login
    const otpResA = await axios.post(`${BASE_URL}/auth/send-otp`, { mobileNumber: mobileA });
    const verifyResA = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      mobileNumber: mobileA,
      otp: otpResA.data.devOtp
    });
    const tokenA = verifyResA.data.tokens.accessToken;
    const userAId = verifyResA.data.user.id;
    assert(Boolean(tokenA), 'User A logged in and received access token');

    // User B Login
    const otpResB = await axios.post(`${BASE_URL}/auth/send-otp`, { mobileNumber: mobileB });
    const verifyResB = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      mobileNumber: mobileB,
      otp: otpResB.data.devOtp
    });
    const tokenB = verifyResB.data.tokens.accessToken;
    const userBId = verifyResB.data.user.id;
    assert(Boolean(tokenB), 'User B logged in and received access token');
    assert(userAId !== userBId, 'User A and User B have separate unique user IDs');

    // Admin Login
    const adminLoginRes = await axios.post(`${BASE_URL}/admin/login`, {
      email: 'admin@electropathy.ai',
      password: 'Admin@Electropathy2026!'
    });
    const adminToken = adminLoginRes.data.tokens.accessToken;
    assert(Boolean(adminToken), 'Admin logged in and received admin token');

    // ----------------------------------------------------
    // Scenario 2: Regular User Token Cannot Access Admin Endpoints (403 Forbidden)
    // ----------------------------------------------------
    console.log('\n[Scenario 2: Privilege check - Regular user cannot access Admin APIs]');

    try {
      await axios.get(`${BASE_URL}/admin/overview`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'User A should not access admin overview');
    } catch (err: any) {
      assert(err.response?.status === 403, 'User A cannot access /api/admin/overview (403 Forbidden)');
    }

    try {
      await axios.get(`${BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'User A should not access admin users');
    } catch (err: any) {
      assert(err.response?.status === 403, 'User A cannot access /api/admin/users (403 Forbidden)');
    }

    try {
      await axios.get(`${BASE_URL}/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'User A should not access admin audit-logs');
    } catch (err: any) {
      assert(err.response?.status === 403, 'User A cannot access /api/admin/audit-logs (403 Forbidden)');
    }

    // ----------------------------------------------------
    // Scenario 3: IDOR (Insecure Direct Object Reference) Protection
    // ----------------------------------------------------
    console.log('\n[Scenario 3: IDOR Protection between User A and User B]');

    // User A creates a conversation
    const convARes = await axios.post(
      `${BASE_URL}/conversations`,
      {
        title: "User A's Confidential Treatment Consultation",
        initialMessage: 'Doctor, I need an electro-homeopathic formula for acute lymphadenitis.'
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const convAId = convARes.data.conversation.id;
    assert(Boolean(convAId), "User A created confidential conversation successfully");

    // Attack 1: User B tries to READ User A's conversation
    try {
      await axios.get(`${BASE_URL}/conversations/${convAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert(false, "User B should not be able to read User A's conversation");
    } catch (err: any) {
      assert(err.response?.status === 404, 'User B cannot READ User A conversation (404 Not Found / Isolated)');
    }

    // Attack 2: User B tries to RENAME User A's conversation
    try {
      await axios.patch(
        `${BASE_URL}/conversations/${convAId}`,
        { title: 'Hacked by User B' },
        { headers: { Authorization: `Bearer ${tokenB}` } }
      );
      assert(false, "User B should not be able to rename User A's conversation");
    } catch (err: any) {
      assert(err.response?.status === 404, 'User B cannot RENAME User A conversation (404 Not Found / Isolated)');
    }

    // Attack 3: User B tries to INJECT MESSAGES into User A's conversation
    try {
      await axios.post(
        `${BASE_URL}/conversations/${convAId}/messages`,
        {
          role: 'user',
          content: 'Malicious injection message from User B'
        },
        { headers: { Authorization: `Bearer ${tokenB}` } }
      );
      assert(false, "User B should not be able to append messages to User A's conversation");
    } catch (err: any) {
      assert(err.response?.status === 404, 'User B cannot INJECT messages into User A conversation (404 Not Found / Isolated)');
    }

    // Attack 4: User B tries to DELETE User A's conversation
    try {
      await axios.delete(`${BASE_URL}/conversations/${convAId}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert(false, "User B should not be able to delete User A's conversation");
    } catch (err: any) {
      assert(err.response?.status === 404, 'User B cannot DELETE User A conversation (404 Not Found / Isolated)');
    }

    // Verify User A's conversation was untouched
    const verifyConvA = await axios.get(`${BASE_URL}/conversations/${convAId}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(
      verifyConvA.data.conversation.title === "User A's Confidential Treatment Consultation",
      "User A's conversation title remains completely unaltered"
    );
    assert(
      verifyConvA.data.conversation.messages.length === 1,
      "User A's conversation has no injected messages"
    );

    // ----------------------------------------------------
    // Scenario 4: Anti-Privilege Escalation
    // ----------------------------------------------------
    console.log('\n[Scenario 4: Anti-Privilege Escalation on User Profile Updates]');

    const escalateRes = await axios.post(
      `${BASE_URL}/auth/profile`,
      {
        fullName: 'Attacker Attempting Escalation',
        role: 'admin' // Attempt privilege escalation
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    assert(escalateRes.data.user.role !== 'admin', 'User role does not escalate to "admin", escalation payload ignored');
    assert(escalateRes.data.user.role === 'patient', 'User role remains "patient" (default unprivileged role)');

    // Also verify directly in the database
    const dbUserA = await prisma.user.findUnique({ where: { id: userAId } });
    assert(dbUserA?.role !== 'admin', 'Database confirmation: User A role is strictly not "admin"');

    // ----------------------------------------------------
    // Scenario 5: Account Deactivation & Session Revocation
    // ----------------------------------------------------
    console.log('\n[Scenario 5: Safe Account Deactivation & Immediate Token Revocation]');

    // Admin deactivates User B
    const deactivateRes = await axios.patch(
      `${BASE_URL}/admin/users/${userBId}/status`,
      { isActive: false },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(deactivateRes.status === 200, 'Admin deactivated User B successfully');

    // User B tries to make an API request with existing token
    try {
      await axios.get(`${BASE_URL}/conversations`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert(false, 'Deactivated user should not be able to access conversations');
    } catch (err: any) {
      assert(err.response?.status === 403, 'Deactivated User B request is blocked with 403 Forbidden');
    }

    // Verify all active refresh tokens for User B are revoked (isRevoked: false is 0)
    const activeRefreshTokens = await prisma.refreshToken.findMany({
      where: { userId: userBId, isRevoked: false }
    });
    assert(activeRefreshTokens.length === 0, 'All refresh tokens for deactivated user were revoked (isRevoked = true)');

    const revokedTokens = await prisma.refreshToken.findMany({
      where: { userId: userBId, isRevoked: true }
    });
    assert(revokedTokens.length > 0, 'Revocation records preserved in database for security audit trail');

    // Re-activate User B to restore clean state
    await axios.patch(
      `${BASE_URL}/admin/users/${userBId}/status`,
      { isActive: true },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('  ✔ [PASS] User B reactivated for clean test state');

    // ----------------------------------------------------
    // Scenario 6: Secret Exposure Prevention
    // ----------------------------------------------------
    console.log('\n[Scenario 6: Sensitive credential isolation]');

    // Admin searches User A
    const adminInspectUser = await axios.get(
      `${BASE_URL}/admin/users?query=${encodeURIComponent(mobileA)}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const inspectedUser = adminInspectUser.data.users[0];
    assert(!('passwordHash' in inspectedUser), 'passwordHash is not present in User listing');
    assert(!('refreshTokenHash' in inspectedUser), 'refreshTokenHash is not present in User listing');

    // Admin login with wrong password
    try {
      await axios.post(`${BASE_URL}/admin/login`, {
        email: 'admin@electropathy.ai',
        password: 'WrongPassword123!'
      });
      assert(false, 'Bad admin password should fail');
    } catch (err: any) {
      assert(err.response?.status === 401, 'Admin login with invalid password rejected with 401');
    }

    console.log('\n======================================================');
    console.log(`📊 LOOP 3 RESULTS: ${passedChecks} PASSED, ${failedChecks} FAILED`);
    console.log('======================================================\n');

    if (failedChecks > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error in Loop 3:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSecurityTests();
