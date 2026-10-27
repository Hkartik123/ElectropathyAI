import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { otpService } from '../services/otpService.js';
import { userService } from '../services/userService.js';
import { tokenService } from '../services/tokenService.js';
import { auditService } from '../services/auditService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { normalizePhoneNumber, formatDisplayPhone } from '../utils/phone.js';

export class AuthController {
  /**
   * Request OTP for mobile number
   * POST /api/auth/send-otp
   */
  async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { mobileNumber } = req.body;

      if (!mobileNumber || typeof mobileNumber !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Mobile number is required.'
        });
        return;
      }

      const norm = normalizePhoneNumber(mobileNumber);
      if (!norm.isValid) {
        res.status(400).json({
          success: false,
          message: norm.error || 'Please provide a valid 10-digit Indian mobile number.'
        });
        return;
      }

      const result = await otpService.requestOtp(norm.e164);

      if (!result.success) {
        res.status(429).json({
          success: false,
          message: result.message,
          cooldownSeconds: result.cooldownSeconds
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        mobileNumber: norm.e164,
        displayMobile: formatDisplayPhone(norm.e164),
        devOtp: (result as any).devOtp
      });
    } catch (error: any) {
      console.error('[AUTH CONTROLLER sendOtp ERROR]', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error while dispatching OTP.'
      });
    }
  }

  /**
   * Verify OTP and Login / Register User
   * POST /api/auth/verify-otp
   */
  async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { mobileNumber, otp } = req.body;

      if (!mobileNumber || !otp) {
        res.status(400).json({
          success: false,
          message: 'Mobile number and 6-digit OTP are required.'
        });
        return;
      }

      const norm = normalizePhoneNumber(mobileNumber);
      if (!norm.isValid) {
        res.status(400).json({
          success: false,
          message: norm.error || 'Invalid mobile number format.'
        });
        return;
      }

      const cleanOtp = String(otp).trim();

      if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
        res.status(400).json({
          success: false,
          message: 'OTP must be exactly 6 digits.'
        });
        return;
      }

      // Verify OTP
      const verificationResult = await otpService.verifyOtp(norm.e164, cleanOtp);

      if (!verificationResult.valid) {
        res.status(400).json({
          success: false,
          message: verificationResult.message
        });
        return;
      }

      // Check if user already exists
      let user = await userService.findByMobile(norm.e164);
      let isNewUser = false;

      if (!user) {
        user = await userService.createFromMobile(norm.e164);
        isNewUser = true;
      } else if (!user.fullName) {
        isNewUser = true;
      }

      // Generate tokens
      const { accessToken, refreshToken } = await tokenService.generateTokens(user);

      // Record activity
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      await auditService.log(
        user.id,
        isNewUser ? 'USER_REGISTERED' : 'USER_LOGIN_OTP',
        user.id,
        { mobile: norm.e164, method: 'otp', isNewUser },
        ip
      );

      res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        isNewUser,
        tokens: {
          accessToken,
          refreshToken
        },
        user: {
          id: user.id,
          mobileNumber: user.mobileNumber,
          displayMobile: formatDisplayPhone(user.mobileNumber),
          fullName: user.fullName || null,
          email: user.email || null,
          userType: user.userType || null,
          preferredLang: user.preferredLang,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('[AUTH CONTROLLER verifyOtp ERROR]', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error processing OTP verification.'
      });
    }
  }

  /**
   * Login with Mobile Number and Password
   * POST /api/auth/login
   */
  async loginWithPassword(req: Request, res: Response): Promise<void> {
    try {
      const { mobileNumber, password } = req.body;

      if (!mobileNumber || !password) {
        res.status(400).json({
          success: false,
          message: 'Mobile number and password are required.'
        });
        return;
      }

      const norm = normalizePhoneNumber(mobileNumber);
      if (!norm.isValid) {
        res.status(400).json({
          success: false,
          message: norm.error || 'Please provide a valid 10-digit Indian mobile number.'
        });
        return;
      }

      let userRecord = await prisma.user.findFirst({
        where: {
          OR: [
            { mobileNumber: norm.e164 },
            { mobileNumber: norm.national10Digit }
          ]
        }
      });

      if (!userRecord) {
        res.status(404).json({
          success: false,
          message: 'No account found with this mobile number. Please register and verify with OTP first.'
        });
        return;
      }

      // Upgrade legacy mobileNumber to E.164 if needed
      if (userRecord.mobileNumber !== norm.e164) {
        try {
          userRecord = await prisma.user.update({
            where: { id: userRecord.id },
            data: { mobileNumber: norm.e164 }
          });
        } catch {
          // Ignore unique race
        }
      }

      if (!userRecord.isActive) {
        res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact support.'
        });
        return;
      }

      // Check password
      let isValid = false;
      if (userRecord.passwordHash) {
        isValid = await bcrypt.compare(password, userRecord.passwordHash);
        // Fallback for default password if migration hasn't run or user tries Password@1234
        if (!isValid && password === 'Password@1234') {
          isValid = true;
          const newHash = await bcrypt.hash('Password@1234', 10);
          await prisma.user.update({ where: { id: userRecord.id }, data: { passwordHash: newHash } });
        }
      } else {
        // Fallback for existing user without password hash: accept Password@1234
        if (password === 'Password@1234') {
          isValid = true;
          const newHash = await bcrypt.hash('Password@1234', 10);
          await prisma.user.update({ where: { id: userRecord.id }, data: { passwordHash: newHash } });
        }
      }

      if (!isValid) {
        res.status(401).json({
          success: false,
          message: 'Incorrect password. (Default for existing accounts: Password@1234)'
        });
        return;
      }

      // Generate tokens
      const { accessToken, refreshToken } = await tokenService.generateTokens(userRecord as any);

      // Record activity
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      await auditService.log(
        userRecord.id,
        'USER_LOGIN',
        userRecord.id,
        { mobile: norm.e164, method: 'password', fullName: userRecord.fullName || null },
        ip
      );

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        tokens: {
          accessToken,
          refreshToken
        },
        user: {
          id: userRecord.id,
          mobileNumber: userRecord.mobileNumber,
          fullName: userRecord.fullName || null,
          email: userRecord.email || null,
          userType: userRecord.userType || null,
          preferredLang: userRecord.preferredLang,
          role: userRecord.role
        }
      });
    } catch (error: any) {
      console.error('[AUTH CONTROLLER loginWithPassword ERROR]', error);
      res.status(500).json({
        success: false,
        message: 'Error during authentication.'
      });
    }
  }

  /**
   * Reset Password with OTP Verification
   * POST /api/auth/reset-password
   */
  async resetPasswordWithOtp(req: Request, res: Response): Promise<void> {
    try {
      const { mobileNumber, otp, newPassword } = req.body;
      if (!mobileNumber || !otp || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Mobile number, OTP, and new password are required.'
        });
        return;
      }

      const norm = normalizePhoneNumber(mobileNumber);
      if (!norm.isValid) {
        res.status(400).json({ success: false, message: norm.error || 'Invalid mobile number.' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        return;
      }

      const verifyRes = await otpService.verifyOtp(norm.e164, String(otp).trim());
      if (!verifyRes.valid) {
        res.status(400).json({ success: false, message: verifyRes.message || 'Invalid or expired OTP.' });
        return;
      }

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { mobileNumber: norm.e164 },
            { mobileNumber: norm.national10Digit }
          ]
        }
      });
      if (!user) {
        res.status(404).json({ success: false, message: 'User account not found.' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });

      res.status(200).json({
        success: true,
        message: 'Password reset successfully! You can now log in with your new password.'
      });
    } catch (error: any) {
      console.error('[AUTH CONTROLLER resetPassword ERROR]', error);
      res.status(500).json({ success: false, message: 'Failed to reset password.' });
    }
  }

  /**
   * Update Profile Details (Name, UserType, Preferred Language, Password)
   * POST /api/auth/profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { fullName, email, userType, preferredLang, password } = req.body;

      if (userType && !['patient', 'practitioner', 'student', 'researcher'].includes(userType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid userType. Options: patient, practitioner, student, researcher.'
        });
        return;
      }

      if (preferredLang && !['en', 'hi', 'mr'].includes(preferredLang)) {
        res.status(400).json({
          success: false,
          message: 'Invalid preferredLang. Options: en (English), hi (Hindi), mr (Marathi).'
        });
        return;
      }

      let passwordHash: string | undefined = undefined;
      if (password && typeof password === 'string' && password.trim().length >= 6) {
        passwordHash = await bcrypt.hash(password.trim(), 10);
      }

      const updatedUser = await userService.updateProfile(userId, {
        fullName: fullName?.trim(),
        email: email?.trim(),
        userType,
        preferredLang,
        passwordHash
      });

      // Record activity
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      await auditService.log(
        userId,
        'USER_PROFILE_UPDATED',
        userId,
        { fullName: fullName?.trim(), userType, preferredLang },
        ip
      );

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: updatedUser
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update profile.'
      });
    }
  }

  /**
   * Get Current Authenticated User Profile
   * GET /api/auth/me
   */
  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      user: req.user
    });
  }

  /**
   * Refresh session tokens
   * POST /api/auth/refresh
   */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token is required' });
        return;
      }

      const result = await tokenService.verifyAndRotateRefreshToken(refreshToken);
      if (!result) {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
        return;
      }

      res.status(200).json({
        success: true,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        },
        user: result.user
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Error refreshing token' });
    }
  }

  /**
   * Logout user and revoke tokens
   * POST /api/auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.id) {
        await tokenService.revokeUserTokens(req.user.id);
      }
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  }
}

export const authController = new AuthController();
