import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';
import { 
  Phone, 
  Lock, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  User as UserIcon, 
  ShieldCheck, 
  Loader2, 
  Eye, 
  EyeOff, 
  ClipboardList,
  Brain,
  FolderLock,
  Activity,
  BookOpen,
  Users as UsersIcon,
  Mail,
  BarChart3,
  ShieldAlert
} from 'lucide-react';

interface LoginModalProps {
  onSuccess: (user: User) => void;
  onAdminSuccess?: (admin: any) => void;
  initialPortal?: 'patient' | 'admin';
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, onAdminSuccess, initialPortal = 'patient' }) => {
  // Persona switcher: 'patient' vs 'admin'
  const [portal, setPortal] = useState<'patient' | 'admin'>(initialPortal);
  
  // Patient Modes
  const [mode, setMode] = useState<'password_login' | 'otp_register' | 'forgot_password'>('password_login');
  const [registerStep, setRegisterStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [forgotStep, setForgotStep] = useState<'phone' | 'reset'>('phone');

  // Form Fields - Patient
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState('patient');
  const [preferredLang, setPreferredLang] = useState('en');

  // Form Fields - Admin
  const [adminEmail, setAdminEmail] = useState('admin@electropathy.ai');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminShowPassword, setAdminShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  
  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const switchMode = (newMode: 'password_login' | 'otp_register' | 'forgot_password') => {
    setMode(newMode);
    setError(null);
    setInfoMessage(null);
    setRegisterStep('phone');
    setForgotStep('phone');
    setOtp('');
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!adminEmail.trim()) {
      setError('Please enter your administrator email.');
      return;
    }
    if (!adminPassword) {
      setError('Please enter your administrator password.');
      return;
    }

    setAdminLoading(true);
    try {
      const res = await api.adminLogin(adminEmail.trim(), adminPassword);
      if (res.success && res.tokens?.accessToken) {
        if (onAdminSuccess) {
          onAdminSuccess(res.admin || { role: 'admin', email: adminEmail.trim() });
        }
      } else {
        setError(res.message || 'Invalid administrator credentials. Access denied.');
      }
    } catch (err: any) {
      setError('Unable to reach administrator authentication service.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = mobileNumber.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10 || !/^[6-9]\d{9}$/.test(clean)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginWithPassword(clean, password);
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.message || 'Login failed. Please verify your mobile number and password.');
      }
    } catch (err: any) {
      setError('Unable to reach server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = mobileNumber.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10 || !/^[6-9]\d{9}$/.test(clean)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(clean);
      if (res.success) {
        setRegisterStep('otp');
        setCooldown(res.cooldownSeconds || 10);
        if (res.devOtp) setDevOtp(res.devOtp);
      } else {
        setError(res.message);
        if (res.cooldownSeconds) setCooldown(res.cooldownSeconds);
      }
    } catch (err: any) {
      setError('Error dispatching OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP received via SMS.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(mobileNumber, otp);
      if (res.success && res.user) {
        setRegisterStep('profile');
      } else {
        setError(res.message || 'Invalid or expired OTP code.');
      }
    } catch (err: any) {
      setError('Verification failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Please create a password of at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.updateProfile({
        fullName: fullName.trim(),
        userType,
        preferredLang,
        password: password.trim()
      });
      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setError(res.message || 'Could not complete registration.');
      }
    } catch (err: any) {
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = mobileNumber.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(clean);
      if (res.success) {
        setForgotStep('reset');
        setCooldown(res.cooldownSeconds || 10);
        if (res.devOtp) setDevOtp(res.devOtp);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError('Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(mobileNumber, otp, newPassword);
      if (res.success) {
        setInfoMessage('Password successfully updated! You can now log in.');
        setPassword(newPassword);
        setMode('password_login');
      } else {
        setError(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError('Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-wrapper">
      {/* ======================================================== */}
      {/* LEFT COLUMN: DYNAMIC HERO, FEATURES & TRUST              */}
      {/* ======================================================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {portal === 'patient' ? (
          <>
            {/* Eyebrow Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              backgroundColor: '#E0F5F2',
              borderRadius: '999px',
              width: 'fit-content'
            }}>
              <span style={{ width: '12px', height: '3px', backgroundColor: '#00A896', borderRadius: '2px' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#028090', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Personal Patient Health Portal
              </span>
            </div>

            {/* Heading & Subtitle */}
            <div>
              <h1 style={{
                fontSize: '1.95rem',
                lineHeight: 1.15,
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.025em',
                marginBottom: '6px'
              }}>
                Your Personal Health & <br />
                <span style={{
                  background: 'linear-gradient(135deg, #00A896 0%, #0F4C81 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Electropathy Care
                </span>
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.45, maxWidth: '480px' }}>
                A confidential, private health portal to consult with our AI assistant, track symptom progressions, and review your doctor's prescriptions anytime in complete privacy.
              </p>
            </div>

            {/* 4 Feature Items (2x2 Grid) */}
            <div className="auth-features-grid">
              <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#E0F5F2',
                  color: '#00A896',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Brain size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                    AI Consultation & Chat
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                    Discuss symptoms & follow up anytime
                  </div>
                </div>
              </div>

              <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#EBF3FA',
                  color: '#0F4C81',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ClipboardList size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                    My Health Records
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                    Access your personal intake & charts
                  </div>
                </div>
              </div>

              <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FolderLock size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                    100% Private Isolation
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                    Encrypted & restricted to your mobile
                  </div>
                </div>
              </div>

              <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#F3E8FF',
                  color: '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                    Natural Electropathy
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                    Safe, plant-based medicinal remedies
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Trust Badges (Single Row) */}
            <div className="auth-trust-badges">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#0F4C81',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Phone size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase' }}>Confidential</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>Phone Verified</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Single Identity</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#00A896',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BookOpen size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase' }}>Evidence-Based</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>Electropathy</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Verified Herbal Care</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase' }}>Protected</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>Your Data</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Strictly Isolated</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Eyebrow Pill - Admin */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 10px',
              backgroundColor: '#EBF3FA',
              borderRadius: '999px',
              width: 'fit-content'
            }}>
              <span style={{ width: '12px', height: '3px', backgroundColor: '#0F4C81', borderRadius: '2px' }} />
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0F4C81', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Clinical Administration & Governance
              </span>
            </div>

            {/* Heading & Subtitle - Admin */}
            <div>
              <h1 style={{
                fontSize: '1.95rem',
                lineHeight: 1.15,
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.025em',
                marginBottom: '6px'
              }}>
                Centralized Practice & <br />
                <span style={{
                  background: 'linear-gradient(135deg, #0F4C81 0%, #0284C7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Governance Console
                </span>
              </h1>
              <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.45, maxWidth: '480px' }}>
                Supervise all registered patients, conduct clinical intakes, oversee AI diagnostic suggestions, and monitor system security telemetry in real-time.
              </p>
            </div>

            {/* 4 Feature Items (2x2 Grid) - Admin */}
            <div className="auth-features-grid">
              <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#EBF3FA',
                  color: '#0F4C81',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UsersIcon size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                    Patient Directory
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                    Oversee all registered patient accounts
                  </div>
                </div>
              </div>

              <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#E0F5F2',
                  color: '#00A896',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ClipboardList size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                    + New Patient Intake
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                    Conduct multi-step diagnostic forms
                  </div>
                </div>
              </div>

              <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#F3E8FF',
                  color: '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <BarChart3 size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                    Activity Telemetry
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                    Live audit trails & security metrics
                  </div>
                </div>
              </div>

              <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                    Role-Based Access
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                    Strict isolation & authorization
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Trust Badges (Single Row) - Admin */}
            <div className="auth-trust-badges">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#0F4C81',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UsersIcon size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase' }}>Roster Oversight</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>All Patients</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Full Visibility</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#00A896',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ClipboardList size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase' }}>Clinical Intake</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>Diagnostic Tool</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Structured Forms</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase' }}>Full Audit</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.1 }}>Event Logs</div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>Security Tracing</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: ELEVATED AUTH CARD (COMPACT VIEWPORT FIT)  */}
      {/* ======================================================== */}
      <div className="auth-card-elevated" style={{ padding: '20px 22px' }}>
        
        {/* ======================================================== */}
        {/* PERSONA SWITCHER: PATIENT LOGIN vs ADMIN PORTAL          */}
        {/* ======================================================== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          backgroundColor: '#F1F5F9',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <button
            type="button"
            id="login-switcher-patient"
            onClick={() => {
              setPortal('patient');
              setError(null);
              setInfoMessage(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '9px',
              fontSize: '0.84rem',
              fontWeight: portal === 'patient' ? 700 : 600,
              color: portal === 'patient' ? '#007A6B' : '#64748B',
              backgroundColor: portal === 'patient' ? '#FFFFFF' : 'transparent',
              boxShadow: portal === 'patient' ? '0 2px 8px rgba(0, 168, 150, 0.16)' : 'none',
              border: portal === 'patient' ? '1px solid #CCFBF1' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <UserIcon size={16} color={portal === 'patient' ? '#00A896' : '#94A3B8'} />
            <span>Patient Login</span>
            {portal === 'patient' && (
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                backgroundColor: '#E0F5F2',
                color: '#00A896',
                padding: '1px 6px',
                borderRadius: '999px',
                textTransform: 'uppercase'
              }}>
                User
              </span>
            )}
          </button>

          <button
            type="button"
            id="login-switcher-admin"
            onClick={() => {
              setPortal('admin');
              setError(null);
              setInfoMessage(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '9px',
              fontSize: '0.84rem',
              fontWeight: portal === 'admin' ? 700 : 600,
              color: portal === 'admin' ? '#0F4C81' : '#64748B',
              backgroundColor: portal === 'admin' ? '#FFFFFF' : 'transparent',
              boxShadow: portal === 'admin' ? '0 2px 8px rgba(15, 76, 129, 0.16)' : 'none',
              border: portal === 'admin' ? '1px solid #BAE6FD' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <ShieldCheck size={16} color={portal === 'admin' ? '#0F4C81' : '#94A3B8'} />
            <span>Admin Login</span>
            {portal === 'admin' && (
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                backgroundColor: '#EBF3FA',
                color: '#0F4C81',
                padding: '1px 6px',
                borderRadius: '999px',
                textTransform: 'uppercase'
              }}>
                Portal
              </span>
            )}
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <ShieldAlert size={15} />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div style={{
            backgroundColor: '#DEF7EC',
            border: '1px solid #84E1BC',
            color: '#03543F',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <CheckCircle2 size={14} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: PATIENT AUTH FLOW                                */}
        {/* ======================================================== */}
        {portal === 'patient' && (
          <div>
            {/* Card Header with Brand Icon */}
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                margin: '0 auto 6px',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 6px 14px rgba(0, 168, 150, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF'
              }}>
                <img src="/favicon.svg" alt="Electropathy AI" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
                {mode === 'password_login' && 'Patient Sign In'}
                {mode === 'otp_register' && (
                  registerStep === 'phone' ? 'Verify Mobile Number' :
                  registerStep === 'otp' ? 'Enter SMS OTP' :
                  'Patient Profile & Password'
                )}
                {mode === 'forgot_password' && 'Reset Account Password'}
              </h2>
              
              <p style={{ color: '#64748B', fontSize: '0.78rem' }}>
                {mode === 'password_login' && 'Sign in with your mobile number to view your private consultations.'}
                {mode === 'otp_register' && registerStep === 'phone' && 'OTP verification is required only once to register your account.'}
                {mode === 'otp_register' && registerStep === 'otp' && `Enter the 6-digit code sent to +91 ${mobileNumber}`}
                {mode === 'otp_register' && registerStep === 'profile' && 'Choose a secure password and enter your patient details.'}
                {mode === 'forgot_password' && 'Verify your mobile number to set a new password.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              borderRadius: '8px',
              padding: '3px',
              marginBottom: '14px'
            }}>
              <button
                type="button"
                onClick={() => switchMode('password_login')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  fontWeight: mode === 'password_login' ? 700 : 500,
                  color: mode === 'password_login' ? '#0F4C81' : '#64748B',
                  backgroundColor: mode === 'password_login' ? '#FFFFFF' : 'transparent',
                  borderRadius: '6px',
                  border: 'none',
                  boxShadow: mode === 'password_login' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('otp_register')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  fontWeight: mode === 'otp_register' ? 700 : 500,
                  color: mode === 'otp_register' ? '#0F4C81' : '#64748B',
                  backgroundColor: mode === 'otp_register' ? '#FFFFFF' : 'transparent',
                  borderRadius: '6px',
                  border: 'none',
                  boxShadow: mode === 'otp_register' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer'
                }}
              >
                New Patient / OTP
              </button>
            </div>

            {/* TAB 1: PASSWORD LOGIN */}
            {mode === 'password_login' && (
              <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <div>
                  <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    Mobile Number
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '0 10px',
                      backgroundColor: '#F8FAFC',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#334155',
                      height: '36px'
                    }}>
                      <span>🇮🇳</span>
                      <span>+91</span>
                    </div>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="10-digit mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      autoFocus
                      required
                      style={{ borderRadius: '8px', padding: '6px 10px', height: '36px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <label className="input-label" style={{ marginBottom: 0, fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot_password')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0F4C81',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: '36px', borderRadius: '8px', padding: '6px 10px', height: '36px', fontSize: '0.85rem' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    marginTop: '2px',
                    background: 'linear-gradient(135deg, #00A896 0%, #0F4C81 100%)',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: '0 3px 8px rgba(0, 168, 150, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  disabled={loading || mobileNumber.length !== 10 || !password}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : (
                    <>
                      <span>Sign In to Patient Portal</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  margin: '2px 0',
                  gap: '8px',
                  color: '#94A3B8',
                  fontSize: '0.68rem',
                  fontWeight: 600
                }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
                  <span>OR</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
                </div>

                {/* Outline Button */}
                <button
                  type="button"
                  onClick={() => switchMode('otp_register')}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '8px',
                    color: '#0F4C81',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Phone size={14} />
                  <span>New Patient? <strong>Verify number & register with OTP</strong></span>
                </button>
              </form>
            )}

            {/* TAB 2: OTP REGISTRATION */}
            {mode === 'otp_register' && (
              <div>
                {registerStep === 'phone' && (
                  <form onSubmit={handleSendOtpRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                        Mobile Number for Verification
                      </label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0 10px',
                          backgroundColor: '#F8FAFC',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#334155',
                          height: '36px'
                        }}>
                          <span>🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          type="tel"
                          className="input-field"
                          placeholder="10-digit mobile number"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          autoFocus
                          required
                          style={{ borderRadius: '8px', padding: '6px 10px', height: '36px', fontSize: '0.85rem' }}
                        />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                        A 6-digit code will be sent to verify your number.
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="btn"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'linear-gradient(135deg, #00A896 0%, #0F4C81 100%)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                      disabled={loading || mobileNumber.length !== 10}
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : (
                        <>
                          <span>Send Verification OTP</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {registerStep === 'otp' && (
                  <form onSubmit={handleVerifyOtpRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                        6-Digit Verification Code
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="••••••"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: '1.2rem', fontWeight: 700, borderRadius: '8px', height: '38px' }}
                        autoFocus
                        required
                      />

                      {devOtp && (
                        <div style={{
                          marginTop: '6px',
                          padding: '5px 8px',
                          backgroundColor: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          color: '#065F46',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>OTP: <strong>{devOtp}</strong></span>
                          <button
                            type="button"
                            onClick={() => setOtp(devOtp)}
                            style={{
                              backgroundColor: '#059669',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Auto-fill
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="btn"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'linear-gradient(135deg, #00A896 0%, #0F4C81 100%)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                      disabled={loading || otp.length !== 6}
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : (
                        <>
                          <span>Verify Number</span>
                          <CheckCircle2 size={15} />
                        </>
                      )}
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <button
                        type="button"
                        onClick={() => setRegisterStep('phone')}
                        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                      >
                        Change Number
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtpRegister}
                        disabled={cooldown > 0 || loading}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: cooldown > 0 ? '#94A3B8' : '#0F4C81',
                          cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                          fontWeight: 600,
                          padding: 0
                        }}
                      >
                        {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend OTP'}
                      </button>
                    </div>
                  </form>
                )}

                {registerStep === 'profile' && (
                  <form onSubmit={handleCompleteRegister} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                        Patient Full Name
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Ramesh Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoFocus
                        required
                        style={{ borderRadius: '8px', padding: '6px 10px', height: '34px', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div>
                      <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                        Create Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="input-field"
                          placeholder="Min 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{ paddingRight: '36px', borderRadius: '8px', padding: '6px 10px', height: '34px', fontSize: '0.82rem' }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '2px' }}>
                        Preferred Language
                      </label>
                      <select
                        className="input-field"
                        value={preferredLang}
                        onChange={(e) => setPreferredLang(e.target.value)}
                        style={{ borderRadius: '8px', padding: '4px 8px', height: '32px', fontSize: '0.82rem' }}
                      >
                        <option value="en">English</option>
                        <option value="hi">हिंदी (Hindi)</option>
                        <option value="mr">मराठी (Marathi)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="btn"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        marginTop: '4px',
                        background: 'linear-gradient(135deg, #00A896 0%, #0F4C81 100%)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                      disabled={loading || !fullName.trim() || password.length < 6}
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : (
                        <>
                          <span>Complete Patient Registration</span>
                          <CheckCircle2 size={15} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: FORGOT PASSWORD */}
            {mode === 'forgot_password' && (
              <div>
                {forgotStep === 'phone' && (
                  <form onSubmit={handleSendOtpForgot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                        Registered Mobile Number
                      </label>
                      <input
                        type="tel"
                        className="input-field"
                        placeholder="10-digit mobile number"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        autoFocus
                        required
                        style={{ borderRadius: '8px', padding: '6px 10px', height: '36px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'linear-gradient(135deg, #00A896 0%, #0F4C81 100%)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                      disabled={loading || mobileNumber.length !== 10}
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : (
                        <>
                          <span>Send Reset OTP</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>

                    <div style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => switchMode('password_login')}
                        style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        ← Back to Sign In
                      </button>
                    </div>
                  </form>
                )}

                {forgotStep === 'reset' && (
                  <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                        OTP Code
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="••••••"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        maxLength={6}
                        style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.1rem', fontWeight: 700, borderRadius: '8px', height: '36px' }}
                        autoFocus
                        required
                      />
                    </div>

                    <div>
                      <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                        New Password
                      </label>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Min 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        style={{ borderRadius: '8px', padding: '6px 10px', height: '36px', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'linear-gradient(135deg, #00A896 0%, #0F4C81 100%)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                      disabled={loading || otp.length !== 6 || newPassword.length < 6}
                    >
                      {loading ? <Loader2 className="animate-spin" size={16} /> : (
                        <>
                          <span>Save Password</span>
                          <CheckCircle2 size={15} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: ADMIN CONSOLE AUTH FLOW                          */}
        {/* ======================================================== */}
        {portal === 'admin' && (
          <div>
            {/* Card Header with Shield Icon */}
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                margin: '0 auto 6px',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 6px 14px rgba(15, 76, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#FFFFFF'
              }}>
                <img src="/favicon.svg" alt="Electropathy AI Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
                Admin Console Sign In
              </h2>
              
              <p style={{ color: '#64748B', fontSize: '0.78rem' }}>
                Authorized administrator credentials required for system access.
              </p>
            </div>

            {/* Admin Form */}
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Administrator Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="admin@electropathy.ai"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    style={{ paddingLeft: '34px', borderRadius: '8px', height: '36px', fontSize: '0.85rem' }}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={adminShowPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ paddingLeft: '34px', paddingRight: '36px', borderRadius: '8px', height: '36px', fontSize: '0.85rem' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setAdminShowPassword(!adminShowPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {adminShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

              </div>

              <button
                type="submit"
                className="btn"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  marginTop: '4px',
                  background: 'linear-gradient(135deg, #0F4C81 0%, #0284C7 100%)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '0 3px 8px rgba(15, 76, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                disabled={adminLoading || !adminEmail || !adminPassword}
              >
                {adminLoading ? <Loader2 className="animate-spin" size={16} /> : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Sign In to Admin Console</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div style={{
                marginTop: '6px',
                padding: '8px 10px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '0.72rem',
                color: '#64748B',
                lineHeight: 1.4,
                textAlign: 'center'
              }}>
                🛡️ Admin console provides full directory oversight, conducts new clinical intakes, and inspects event audit trails.
              </div>
            </form>
          </div>
        )}

        {/* Security Footer Notice */}
        <div style={{
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          color: '#94A3B8',
          fontSize: '0.68rem'
        }}>
          <ShieldCheck size={14} color="#00A896" />
          <span>End-to-End Encrypted Session • ElectropathyAI Strict Persona Isolation</span>
        </div>
      </div>
    </div>
  );
};
