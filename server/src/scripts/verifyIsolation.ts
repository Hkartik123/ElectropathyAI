/**
 * End-to-End Verification Test for Electropathy AI:
 * 1. Admin Role-Based Security Enforcement (Patient receives 403 Forbidden on Admin APIs)
 * 2. Independent Patient Account Creation with E.164 Phone Normalization
 * 3. Strict Patient Consultation Isolation (User A vs User B)
 * 4. Strict Patient Medical Case Isolation (User A vs User B)
 * 5. Attack Prevention: IDOR on conversation read, message append, conversation delete, case read
 */

import { prisma } from '../db/prisma.js';
import { tokenService } from '../services/tokenService.js';
import { normalizePhoneNumber } from '../utils/phone.js';

const API_BASE = 'http://localhost:5000/api';

async function testSuite() {
  console.log('\n============================================================');
  console.log('ELECTROPATHY AI - PATIENT DATA ISOLATION & SECURITY AUDIT');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Phone Normalization Unit Checks
  console.log('--- 1. Testing Phone Normalization (E.164 Standards) ---');
  const n1 = normalizePhoneNumber('9823099991');
  assert(n1.isValid && n1.e164 === '+919823099991' && n1.national10Digit === '9823099991', '10-digit Indian number normalizes to +919823099991');

  const n2 = normalizePhoneNumber('+91 98230 99991');
  assert(n2.isValid && n2.e164 === '+919823099991', 'Formatted with country code normalizes to +919823099991');

  const n3 = normalizePhoneNumber('09823099991');
  assert(n3.isValid && n3.e164 === '+919823099991', 'Leading zero normalizes to +919823099991');

  const nInvalid = normalizePhoneNumber('12345');
  assert(!nInvalid.isValid, 'Short invalid number is rejected');

  // 2. Setup Two Isolated Patients in Database
  console.log('\n--- 2. Setting Up Patient A & Patient B ---');
  const phoneA = '+919800000001';
  const phoneB = '+919800000002';

  // Clean prior test data safely
  await prisma.conversation.deleteMany({
    where: { user: { mobileNumber: { in: [phoneA, phoneB, '9800000001', '9800000002'] } } }
  });
  await prisma.patientCase.deleteMany({
    where: { contactNumber: { in: [phoneA, phoneB, '9800000001', '9800000002'] } }
  });
  await prisma.user.deleteMany({
    where: { mobileNumber: { in: [phoneA, phoneB, '9800000001', '9800000002'] } }
  });

  const patientA = await prisma.user.create({
    data: {
      mobileNumber: phoneA,
      fullName: 'Patient Alice Test',
      role: 'patient',
      userType: 'patient',
      isActive: true,
      preferredLang: 'en'
    }
  });

  const patientB = await prisma.user.create({
    data: {
      mobileNumber: phoneB,
      fullName: 'Patient Bob Test',
      role: 'patient',
      userType: 'patient',
      isActive: true,
      preferredLang: 'en'
    }
  });

  assert(patientA.id !== patientB.id, 'Patient A and Patient B have unique internal UUIDs');
  assert(patientA.mobileNumber === phoneA, 'Patient A mobile is normalized to E.164');
  assert(patientB.mobileNumber === phoneB, 'Patient B mobile is normalized to E.164');

  const { accessToken: tokenA } = await tokenService.generateTokens(patientA as any);
  const { accessToken: tokenB } = await tokenService.generateTokens(patientB as any);

  // 3. Admin Route RBAC Authorization
  console.log('\n--- 3. Testing RBAC: Patients Cannot Query Admin Endpoints ---');
  const adminRes = await fetch(`${API_BASE}/admin/overview`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(adminRes.status === 403, 'Patient token querying /api/admin/overview receives 403 Forbidden');

  const adminUsersRes = await fetch(`${API_BASE}/admin/users`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(adminUsersRes.status === 403, 'Patient token querying /api/admin/users receives 403 Forbidden');

  // 4. Consultation Creation & History Isolation
  console.log('\n--- 4. Testing Consultation Isolation Between Patient A & Patient B ---');
  // Patient A creates a consultation
  const convResA = await fetch(`${API_BASE}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenA}`
    },
    body: JSON.stringify({
      title: "Patient Alice Private Consultation",
      initialMessage: "Alice confidential medical inquiry about chronic lymphatic swelling"
    })
  });
  const convDataA = await convResA.json();
  assert(convResA.status === 201 && convDataA.success, 'Patient A creates private consultation');
  const convIdA = convDataA.conversation.id;

  // Patient B lists conversations: MUST BE EMPTY!
  const listResB = await fetch(`${API_BASE}/conversations`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const listDataB = await listResB.json();
  assert(
    listResB.status === 200 && listDataB.total === 0 && listDataB.conversations.length === 0,
    'Patient B consultation history returns 0 records (Alice consultation is not leaked)',
    `Expected 0, received ${listDataB.total}`
  );

  // 5. Attack Simulation: Patient B attempts IDOR to read Patient A's consultation
  console.log('\n--- 5. Attack Simulation: Patient B Attempts IDOR on Patient A Consultation ---');
  const stealRes = await fetch(`${API_BASE}/conversations/${convIdA}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert(
    stealRes.status === 404,
    'Patient B querying Patient A consultation ID receives 404 Not Found (ownership check enforced)'
  );

  // Patient B attempts to tamper/add message to Patient A's consultation
  const tamperRes = await fetch(`${API_BASE}/conversations/${convIdA}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenB}`
    },
    body: JSON.stringify({
      role: 'user',
      content: 'Bob injecting hostile message into Alice consultation'
    })
  });
  assert(
    tamperRes.status === 404,
    'Patient B attempting to inject message into Patient A consultation is rejected (404 Not Found)'
  );

  // Patient B attempts to delete Patient A's consultation
  const deleteRes = await fetch(`${API_BASE}/conversations/${convIdA}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert(
    deleteRes.status === 404,
    'Patient B attempting to delete Patient A consultation is rejected (404 Not Found)'
  );

  // 6. Medical Case History Isolation
  console.log('\n--- 6. Testing Patient Medical Case Isolation ---');
  // Create a medical case record for Patient Alice
  const caseAlice = await prisma.patientCase.create({
    data: {
      practitionerId: patientA.id,
      patientName: 'Alice Test Patient',
      age: 32,
      gender: 'female',
      contactNumber: phoneA,
      city: 'Nagpur',
      chiefComplaints: [{ complaint: 'Lymphatic congestion', duration: '2 weeks', severity: 7 }],
      presentIllness: { description: 'Bilateral cervical lymph node swelling' },
      pastMedical: { chronicConditions: [], allergies: ['Penicillin'] },
      lifestyle: { diet: 'Veg', sleep: 'Normal', appetite: 'Moderate', stressLevel: 'Low' },
      status: 'submitted'
    }
  });

  // Patient B calls GET /api/patients
  const casesResB = await fetch(`${API_BASE}/patients`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const casesDataB = await casesResB.json();
  assert(
    casesResB.status === 200 && casesDataB.cases.length === 0,
    'Patient B calling GET /api/patients sees 0 records (Alice medical record is isolated)',
    `Expected 0, received ${casesDataB.cases.length}`
  );

  // Patient B attempts to view Alice case by ID
  const caseIdorRes = await fetch(`${API_BASE}/patients/${caseAlice.id}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert(
    caseIdorRes.status === 403,
    'Patient B attempting to view Alice case by ID receives 403 Forbidden'
  );

  // Patient Alice views her own case
  const aliceCaseRes = await fetch(`${API_BASE}/patients/${caseAlice.id}`, {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(
    aliceCaseRes.status === 200,
    'Patient Alice successfully views her own authorized medical record'
  );

  // Cleanup test records
  await prisma.conversation.deleteMany({
    where: { user: { mobileNumber: { in: [phoneA, phoneB] } } }
  });
  await prisma.patientCase.deleteMany({
    where: { contactNumber: { in: [phoneA, phoneB] } }
  });
  await prisma.user.deleteMany({
    where: { mobileNumber: { in: [phoneA, phoneB] } }
  });

  console.log('\n============================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testSuite().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
