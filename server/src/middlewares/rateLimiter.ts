import rateLimit from 'express-rate-limit';

// Rate limit OTP requests: Relaxed for development & testing (100 per 15 minutes)
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many OTP requests from this network. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit verification attempts: Relaxed for development & testing (100 per 15 minutes)
export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
