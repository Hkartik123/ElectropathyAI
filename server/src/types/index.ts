export type UserType = 'patient' | 'practitioner' | 'student' | 'researcher';
export type UserRole = 'patient' | 'practitioner' | 'admin';
export type PreferredLang = 'en' | 'hi' | 'mr';

export interface User {
  id: string;
  mobileNumber: string;
  fullName?: string;
  email?: string;
  userType?: UserType;
  preferredLang: PreferredLang;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OtpRecord {
  mobileNumber: string;
  otpHash: string;
  attempts: number;
  expiresAt: Date;
  lastSentAt: Date;
  isUsed: boolean;
}

export interface JwtPayload {
  userId: string;
  mobileNumber: string;
  role: UserRole;
}
