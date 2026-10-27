import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { otpRequestLimiter, otpVerifyLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// Public routes for OTP, Password Login, and Token Refresh
router.post('/login', (req, res) => authController.loginWithPassword(req, res));
router.post('/send-otp', otpRequestLimiter, (req, res) => authController.sendOtp(req, res));
router.post('/verify-otp', otpVerifyLimiter, (req, res) => authController.verifyOtp(req, res));
router.post('/reset-password', (req, res) => authController.resetPasswordWithOtp(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));

// Protected routes (require JWT)
router.post('/profile', authenticate, (req, res) => authController.updateProfile(req, res));
router.get('/me', authenticate, (req, res) => authController.getMe(req, res));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));

export default router;
