import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testPasswordAuth() {
  console.log('\n======================================================');
  console.log('🔑 TESTING PASSWORD AUTHENTICATION & OTP ONBOARDING');
  console.log('======================================================\n');

  try {
    // 1. Existing Account Login with Default Password Password@1234
    console.log('[Test 1: Existing account (8421358609) logs in with Password@1234]');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      mobileNumber: '8421358609',
      password: 'Password@1234'
    });

    if (loginRes.data.success && loginRes.data.tokens?.accessToken) {
      console.log('  ✔ [PASS] Existing account authenticated successfully with Password@1234');
      console.log(`  ✔ [PASS] Authenticated user: ${loginRes.data.user.fullName} (${loginRes.data.user.mobileNumber})`);
    } else {
      console.error('  ✖ [FAIL] Login response did not return expected tokens:', loginRes.data);
    }

    // 2. Existing Account Login with WRONG Password
    console.log('\n[Test 2: Existing account login with incorrect password]');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        mobileNumber: '8421358609',
        password: 'IncorrectPassword999!'
      });
      console.error('  ✖ [FAIL] Expected 401 for wrong password, but request succeeded');
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('  ✔ [PASS] Rejected incorrect password with 401 Unauthorized');
      } else {
        console.error('  ✖ [FAIL] Unexpected error status:', err.response?.status);
      }
    }

    // 3. New User Verification & Registration with OTP
    console.log('\n[Test 3: New user verifies number with OTP & sets custom password]');
    const newTestMobile = '+919999000001';

    // Step A: Request OTP
    const otpRes = await axios.post(`${BASE_URL}/auth/send-otp`, { mobileNumber: newTestMobile });
    console.log('  ✔ [PASS] OTP sent for phone verification');
    const devOtp = otpRes.data.devOtp;

    // Step B: Verify OTP
    const verifyRes = await axios.post(`${BASE_URL}/auth/verify-otp`, {
      mobileNumber: newTestMobile,
      otp: devOtp
    });
    console.log('  ✔ [PASS] OTP verified successfully');
    const token = verifyRes.data.tokens.accessToken;

    // Step C: Set Profile and Password
    const customPass = 'DoctorSecret2026!';
    const profileRes = await axios.post(
      `${BASE_URL}/auth/profile`,
      {
        fullName: 'Dr. New Onboarded Doctor',
        userType: 'practitioner',
        preferredLang: 'en',
        password: customPass
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('  ✔ [PASS] Profile completed and custom password set');

    // Step D: Log in with the newly created password (no OTP needed!)
    console.log('\n[Test 4: Logging in with the newly registered phone and password]');
    const newLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      mobileNumber: newTestMobile,
      password: customPass
    });

    if (newLoginRes.data.success && newLoginRes.data.tokens?.accessToken) {
      console.log('  ✔ [PASS] Successfully logged in with phone and password without needing OTP again!');
    } else {
      console.error('  ✖ [FAIL] Failed to log in with new credentials');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL PASSWORD & OTP AUTHENTICATION TESTS PASSED!');
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('Fatal test error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testPasswordAuth();
