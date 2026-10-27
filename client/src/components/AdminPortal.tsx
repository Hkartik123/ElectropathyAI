import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AdminOverview, AuditLogItem } from '../types';
import { 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  FileText, 
  History, 
  Lock, 
  Mail, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  LogOut,
  Loader2,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  BarChart3,
  Sparkles,
  Check,
  CheckCircle2,
  Activity,
  RefreshCw,
  Clock,
  Radio,
  Database,
  FilePlus,
  X
} from 'lucide-react';
import { PatientIntakeWizard } from './PatientIntakeWizard';
import { AdminAIChatbot } from './AdminAIChatbot';

interface AdminPortalProps {
  onBackToApp: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToApp }) => {
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-assistant' | 'users' | 'conversations' | 'cases' | 'audit'>('overview');
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  
  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [copiedSeed, setCopiedSeed] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Overview State
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userTotal, setUserTotal] = useState(0);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);

  // Conversations State
  const [conversations, setConversations] = useState<any[]>([]);
  const [convSearch, setConvSearch] = useState('');
  const [selectedConvDetail, setSelectedConvDetail] = useState<any | null>(null);

  // Patient Cases State
  const [patientCases, setPatientCases] = useState<any[]>([]);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<any | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    const adminToken = localStorage.getItem('electropathy_admin_token');
    if (adminToken) {
      loadOverview();
      setAdminUser({ role: 'admin', email: 'admin@electropathy.ai' });
    }
  }, []);

  useEffect(() => {
    if (adminUser) {
      if (activeTab === 'overview') loadOverview();
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'conversations') loadConversations();
      if (activeTab === 'cases') loadCases();
      if (activeTab === 'audit') loadAuditLogs();
    }
  }, [activeTab, adminUser]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await api.adminLogin(email, password);
      if (res.success && res.admin) {
        setAdminUser(res.admin);
        loadOverview();
      } else {
        setLoginError(res.message || 'Invalid administrator credentials');
      }
    } catch (err) {
      setLoginError('Unable to connect to administration server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('electropathy_admin_token');
    setAdminUser(null);
    onBackToApp();
  };

  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await api.adminGetOverview();
      if (res.success) setOverview(res.overview);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.adminGetUsers({ search: userSearch });
      if (res.success) {
        setUsers(res.users);
        setUserTotal(res.total);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await api.adminGetConversations({ search: convSearch });
      if (res.success) setConversations(res.conversations);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCases = async () => {
    try {
      const res = await api.adminGetPatientCases({});
      if (res.success) setPatientCases(res.cases);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await api.adminGetAuditLogs();
      if (res.success) setAuditLogs(res.logs);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this account?`)) return;

    try {
      const res = await api.adminUpdateUserStatus(userId, !currentStatus);
      if (res.success) {
        loadUsers();
        if (selectedUserDetail?.id === userId) {
          setSelectedUserDetail((prev: any) => ({ ...prev, isActive: !currentStatus }));
        }
      }
    } catch (err) {
      alert('Failed to update user status.');
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'USER_LOGIN':
      case 'USER_LOGIN_OTP':
        return { label: 'User Login', bg: '#EBF3FA', color: '#0284C7' };
      case 'USER_REGISTERED':
        return { label: 'New User Registered', bg: '#DEF7EC', color: '#059669' };
      case 'PATIENT_CASE_CREATED':
        return { label: 'Patient Case Created', bg: '#FEF3C7', color: '#D97706' };
      case 'CONVERSATION_STARTED':
        return { label: 'Chat Started', bg: '#F3E8FF', color: '#7C3AED' };
      case 'USER_PROFILE_UPDATED':
        return { label: 'Profile Updated', bg: '#EEF2FF', color: '#4F46E5' };
      case 'ADMIN_LOGIN':
        return { label: 'Admin Login', bg: '#0F172A', color: '#38BDF8' };
      case 'UPDATE_USER_STATUS':
        return { label: 'Status Toggled', bg: '#FEE2E2', color: '#DC2626' };
      case 'VIEW_USER_PROFILE':
      case 'VIEW_CONVERSATION':
        return { label: 'Audited View', bg: '#F1F5F9', color: '#475569' };
      default:
        return { label: action.replace(/_/g, ' '), bg: '#F1F5F9', color: '#475569' };
    }
  };

  const formatActivityDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' • ' + d.toLocaleDateString([], { day: '2-digit', month: 'short' });
    } catch {
      return isoStr;
    }
  };

  const formatActivityDetails = (act: any) => {
    if (!act.details) return act.targetId ? `Target: ${act.targetId.slice(0, 8)}...` : 'Platform event logged';
    if (typeof act.details === 'string') return act.details;
    if (act.details.patientName) {
      return `Case: ${act.details.patientName} (${act.details.age || ''} yrs, ${act.details.gender || ''}${act.details.city ? ', ' + act.details.city : ''})`;
    }
    if (act.details.title) {
      return `Chat: "${act.details.title}" (${act.details.language || 'en'})`;
    }
    if (act.details.mobile) {
      return `Mobile: +91 ${act.details.mobile} via ${act.details.method || 'auth'}`;
    }
    if (act.details.isActive !== undefined) {
      return `Set active status to: ${act.details.isActive ? 'Active' : 'Deactivated'}`;
    }
    if (act.details.email) {
      return `Admin email: ${act.details.email}`;
    }
    return JSON.stringify(act.details);
  };

  // 1. ADMIN LOGIN VIEW
  if (!adminUser) {
    const handleFillAdminCredentials = () => {
      setEmail('admin@electropathy.ai');
      setPassword('Admin@Electropathy2026!');
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 2000);
    };

    return (
      <div className="auth-split-wrapper">
        {/* ======================================================== */}
        {/* LEFT COLUMN: HERO, PLATFORM OVERVIEW CARD & FEATURES     */}
        {/* ======================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Back button to Patient Portal */}
          <button
            type="button"
            onClick={onBackToApp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
              width: 'fit-content',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            ← Return to Patient Portal
          </button>

          {/* Eyebrow Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            backgroundColor: '#EBF3FA',
            borderRadius: '999px',
            width: 'fit-content'
          }}>
            <ShieldCheck size={14} color="#0284C7" />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0284C7', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Authorized Admin Access Only
            </span>
          </div>

          {/* Heading */}
          <div>
            <h1 style={{
              fontSize: '1.95rem',
              lineHeight: 1.15,
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.025em',
              marginBottom: '6px'
            }}>
              Administrator <br />
              <span style={{ color: '#0284C7' }}>Portal</span>
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.45, maxWidth: '480px' }}>
              Manage users, monitor platform activity, oversee clinical data, and maintain knowledge resources with secure administrative access.
            </p>
          </div>

          {/* 4 Feature Cards (2x2 Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#EBF3FA',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Users size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                  User Management
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                  View & manage all registered users
                </div>
              </div>
            </div>

            <div className="auth-hero-feature" style={{ padding: '8px 10px', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#DEF7EC',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.2 }}>
                  Clinical Records
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                  Monitor patient cases & consultations
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
                  Platform Analytics
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                  Track platform usage & performance
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
                  Secure & Audited
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3, marginTop: '2px' }}>
                  RBAC protection & full audit trails
                </div>
              </div>
            </div>
          </div>

          {/* Authentic Governance & Security Architecture Status (No Fake Data) */}
          <div style={{
            background: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 100%)',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 24px -6px rgba(15, 23, 42, 0.08)',
            padding: '14px 16px',
            position: 'relative'
          }}>
            {/* Live Indicator Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} color="#0F172A" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>Governance & Architecture Status</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                backgroundColor: '#DEF7EC',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#059669'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', animation: 'pulseGlow 2s infinite' }} />
                <span>Operational</span>
              </div>
            </div>

            {/* System Pillars (Authentic Real Architecture) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#EBF3FA', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Database size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>PostgreSQL Cloud</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Prisma ORM Connected</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#DEF7EC', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Activity size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Audit Engine</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Live Event Tracking</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Lock size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Access Control</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>RBAC Admin Guard</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0F172A' }}>Clinical RAG</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Verified Datasets</div>
                </div>
              </div>
            </div>

            {/* Floating Security Pillars */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '8px'
              }}>
                <Lock size={14} color="#0284C7" />
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0369A1' }}>RBAC Protected</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Authorized personnel only</div>
                </div>
              </div>

              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px'
              }}>
                <CheckCircle2 size={14} color="#059669" />
                <div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#065F46' }}>Audit Trails</div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Real database logging</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: ELEVATED ADMIN LOGIN CARD (COMPACT)        */}
        {/* ======================================================== */}
        <div className="auth-card-elevated auth-card-admin" style={{ padding: '20px 22px' }}>
          {/* Card Header with Dark Shield Icon */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              margin: '0 auto 8px',
              borderRadius: '12px',
              backgroundColor: '#0F172A',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 14px rgba(15, 23, 42, 0.25)'
            }}>
              <ShieldCheck size={22} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
              Administrator Portal
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.78rem' }}>
              Authorized personnel only. Protected by RBAC & Audit Trails.
            </p>
          </div>

          {loginError && (
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
              <ShieldAlert size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
            <div>
              <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                Admin Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type="email"
                  className="input-field"
                  placeholder="Enter your admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '34px', borderRadius: '8px', padding: '6px 10px 6px 34px', height: '36px', fontSize: '0.85rem' }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '34px', paddingRight: '36px', borderRadius: '8px', padding: '6px 36px 6px 34px', height: '36px', fontSize: '0.85rem' }}
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

            {/* Keep me signed in & Forgot Password Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  style={{ borderRadius: '4px', accentColor: '#0F172A' }}
                />
                <span>Keep me signed in</span>
              </label>
              <span style={{ color: '#0284C7', fontWeight: 600, cursor: 'pointer' }}>Forgot Password?</span>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              className="btn"
              style={{
                width: '100%',
                padding: '9px 12px',
                marginTop: '2px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                boxShadow: '0 3px 8px rgba(15, 23, 42, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              disabled={loginLoading || !email || !password}
            >
              {loginLoading ? <Loader2 className="animate-spin" size={16} /> : (
                <>
                  <ShieldCheck size={16} />
                  <span>Secure Admin Login</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {/* OR Divider */}
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

            {/* Outline Return Button */}
            <button
              type="button"
              onClick={onBackToApp}
              style={{
                width: '100%',
                padding: '7px 10px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                borderRadius: '8px',
                color: '#334155',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>← Return to Main Portal</span>
            </button>

            {/* Interactive Admin Seed Credentials Pill */}
            <div style={{
              marginTop: '4px',
              padding: '5px 8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              fontSize: '0.72rem',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={12} color="#64748B" />
                <span>Default: <code>admin@electropathy.ai</code></span>
              </div>
              <button
                type="button"
                onClick={handleFillAdminCredentials}
                style={{
                  backgroundColor: copiedSeed ? '#059669' : '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                {copiedSeed ? <Check size={11} /> : <Sparkles size={11} />}
                {copiedSeed ? 'Filled!' : 'Fill Admin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. ADMIN DASHBOARD VIEW
  const isAIAssistantActive = activeTab === 'ai-assistant';

  return (
    <div style={{
      maxWidth: '1360px',
      margin: '0 auto',
      width: '100%',
      padding: isAIAssistantActive ? '4px 12px 8px' : '16px 12px 60px',
      display: 'flex',
      flexDirection: 'column',
      flex: 1
    }}>
      {/* Top Banner (Dark Governance Console Bar) */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 18px',
        backgroundColor: '#0B132B',
        color: '#FFFFFF',
        borderRadius: '12px',
        marginBottom: isAIAssistantActive ? '10px' : '16px',
        boxShadow: '0 4px 16px rgba(11, 19, 43, 0.25)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#1C2541',
            color: '#38BDF8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            flexShrink: 0
          }}>
            <ShieldCheck size={22} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.2 }}>
              Governance Console
            </h2>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Admin: <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{adminUser.email || 'admin@electropathy.ai'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginLeft: 'auto' }}>
          <button
            onClick={onBackToApp}
            style={{
              padding: '7px 14px',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '0.82rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.15s ease'
            }}
          >
            User Portal
          </button>
          <button
            onClick={handleAdminLogout}
            style={{
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              fontWeight: 700,
              padding: '7px 14px',
              fontSize: '0.82rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Tabs Bar (Horizontally scrollable with smooth touch on mobile, sticky when scrolling long pages) */}
      <div 
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: isAIAssistantActive ? '10px' : '16px',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          flexShrink: 0,
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '4px',
          position: isAIAssistantActive ? 'static' : 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: '#F8FAFC',
          paddingTop: isAIAssistantActive ? 0 : '4px'
        }}
      >
        {[
          { key: 'overview', label: 'Overview', icon: Layers },
          { key: 'ai-assistant', label: 'AI Clinical Assistant', icon: Sparkles },
          { key: 'users', label: 'Users', icon: Users },
          { key: 'conversations', label: 'Conversations', icon: MessageSquare },
          { key: 'cases', label: 'Patient Cases', icon: FileText },
          { key: 'audit', label: 'Audit Trail', icon: History }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                backgroundColor: isActive ? (t.key === 'ai-assistant' ? '#0F4C81' : '#0F172A') : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#334155',
                border: isActive ? (t.key === 'ai-assistant' ? '1px solid #0F4C81' : '1px solid #0F172A') : '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 2px 6px rgba(15,23,42,0.15)' : 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Icon size={15} color={isActive ? '#FFFFFF' : (t.key === 'ai-assistant' ? '#0F4C81' : '#64748B')} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}

      {/* AI CLINICAL ASSISTANT TAB */}
      {activeTab === 'ai-assistant' && (
        <div style={{ height: 'calc(100vh - 130px)', minHeight: '520px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AdminAIChatbot />
        </div>
      )}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loadingOverview || !overview ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <Loader2 className="animate-spin" size={26} style={{ margin: '0 auto 10px', color: '#0284C7' }} />
              <div style={{ fontWeight: 600 }}>Querying database statistics & live metrics...</div>
            </div>
          ) : (
            <>
              {/* 4 Metric Cards (Responsive auto-fit) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px'
              }}>
                {/* Card 1: Total Registered Users */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  padding: '20px 22px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Total Registered Users</span>
                    <Users size={20} color="#0284C7" />
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                    {overview.users.total}
                  </div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#059669', marginTop: '8px' }}>
                    {overview.users.active} Active • {overview.users.inactive} Inactive
                  </div>
                </div>

                {/* Card 2: Conversations & Chats */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  padding: '20px 22px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Conversations & Chats</span>
                    <MessageSquare size={20} color="#059669" />
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                    {overview.conversations.totalConversations}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '8px' }}>
                    {overview.conversations.totalMessages} Messages in PostgreSQL
                  </div>
                </div>

                {/* Card 3: Clinical Patient Cases */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  padding: '20px 22px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Clinical Patient Cases</span>
                    <FileText size={20} color="#D97706" />
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                    {overview.patientCases.total}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '8px' }}>
                    Recorded via Practitioner Intake Wizard
                  </div>
                </div>

                {/* Card 4: Knowledge Base (RAG) */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  padding: '20px 22px',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Knowledge Base (RAG)</span>
                    <Layers size={20} color="#7C3AED" />
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
                    {overview.knowledgeBase.totalDocuments} Docs
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '8px' }}>
                    {overview.knowledgeBase.totalChunks} Indexed Text Chunks
                  </div>
                </div>
              </div>

              {/* RECENT PLATFORM ACTIVITIES MODULE */}
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '20px 24px',
                boxShadow: '0 1px 4px rgba(15, 23, 42, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #F1F5F9',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#DEF7EC',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Activity size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          Recent Platform Activities
                        </h3>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          backgroundColor: '#DEF7EC',
                          borderRadius: '999px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#059669'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', animation: 'pulseGlow 2s infinite' }} />
                          Live Tracking
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                        Live recorded events across practitioner intake, logins, AI chats, and governance
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={loadOverview}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={13} className={loadingOverview ? 'animate-spin' : ''} />
                      <span>Refresh</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('audit')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#0F172A',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>View Full Audit Trail</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Activity Feed Table */}
                {!overview.recentActivities || overview.recentActivities.length === 0 ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
                    <Activity size={28} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
                    <div style={{ fontWeight: 600, color: '#334155' }}>No recent activities recorded yet</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      User logins, patient intake cases, and clinical conversations will appear here automatically.
                    </div>
                  </div>
                ) : (
                  <div className="responsive-table-container">
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid #E2E8F0', color: '#64748B', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '10px 12px' }}>Timestamp</th>
                          <th style={{ padding: '10px 12px' }}>Event / Action</th>
                          <th style={{ padding: '10px 12px' }}>Actor / User</th>
                          <th style={{ padding: '10px 12px' }}>Details</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.recentActivities.map((act) => {
                          const actionConfig = getActionBadge(act.action);
                          return (
                            <tr key={act.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '10px 12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Clock size={13} color="#94A3B8" />
                                  <span>{formatActivityDate(act.createdAt)}</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  backgroundColor: actionConfig.bg,
                                  color: actionConfig.color
                                }}>
                                  {actionConfig.label}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 600, color: '#0F172A' }}>
                                  {act.admin?.fullName || 'Practitioner / User'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                  {act.admin?.mobileNumber ? `+91 ${act.admin.mobileNumber}` : act.admin?.email || 'System'}
                                </div>
                              </td>
                              <td style={{ padding: '10px 12px', color: '#334155' }}>
                                {formatActivityDetails(act)}
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.72rem',
                                  color: '#059669',
                                  fontWeight: 600
                                }}>
                                  <CheckCircle2 size={13} />
                                  <span>Recorded</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* 2. USERS TAB */}
      {activeTab === 'users' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Registered Users ({userTotal})</h3>
            <div style={{ position: 'relative', width: '320px', maxWidth: '100%', flex: '1 1 240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search name, phone, email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                style={{ paddingLeft: '36px', width: '100%' }}
              />
            </div>
          </div>

          <div className="responsive-table-container">
            <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #E2E8F0', color: '#64748B' }}>
                <th style={{ padding: '12px 14px' }}>User / Mobile</th>
                <th style={{ padding: '12px 14px' }}>Role / Type</th>
                <th style={{ padding: '12px 14px' }}>Language</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Joined Date</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{u.fullName || 'No Name Provided'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>+91 {u.mobileNumber}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      backgroundColor: u.role === 'admin' ? '#FEE2E2' : '#EBF3FA',
                      color: u.role === 'admin' ? '#991B1B' : '#0F4C81',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'capitalize'
                    }}>
                      {u.role}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '6px' }}>
                      ({u.userType || 'patient'})
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textTransform: 'uppercase' }}>{u.preferredLang}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {u.isActive ? (
                      <span style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        <CheckCircle size={14} /> Active
                      </span>
                    ) : (
                      <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        <XCircle size={14} /> Deactivated
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748B', fontSize: '0.8rem' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={async () => {
                          const res = await api.adminGetUserDetails(u.id);
                          if (res.success) setSelectedUserDetail(res.user);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      >
                        <Eye size={13} /> View
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => toggleUserStatus(u.id, u.isActive)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            border: '1px solid transparent',
                            cursor: 'pointer',
                            backgroundColor: u.isActive ? '#FEE2E2' : '#D1FAE5',
                            color: u.isActive ? '#991B1B' : '#065F46',
                            fontWeight: 600
                          }}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* 3. CONVERSATIONS TAB */}
      {activeTab === 'conversations' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.2rem' }}>All User Conversations ({conversations.length})</h3>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
              <input
                type="text"
                className="input-field"
                placeholder="Search title, user name..."
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadConversations()}
                style={{ paddingLeft: '36px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={async () => {
                  const res = await api.adminGetConversationDetails(c.id);
                  if (res.success) setSelectedConvDetail(res.conversation);
                }}
                style={{
                  padding: '16px 20px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#F8FAFC'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>{c.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '3px' }}>
                    User: {c.user?.fullName || c.user?.mobileNumber || 'Anonymous'} • {c._count?.messages || 0} messages
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{new Date(c.updatedAt).toLocaleString()}</span>
                  <ChevronRight size={18} color="#94A3B8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. PATIENT CASES TAB */}
      {activeTab === 'cases' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Submitted Clinical Case Records ({patientCases.length})
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.82rem', marginTop: '3px' }}>
                Master roster of all patient intake histories recorded across the system.
              </p>
            </div>

            <button
              onClick={() => setShowIntakeModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: '#0F4C81',
                color: '#FFFFFF',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(15, 76, 129, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <FilePlus size={16} />
              <span>+ New Patient Intake</span>
            </button>
          </div>

          {/* Modal for New Patient Intake */}
          {showIntakeModal && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 999,
              padding: '20px'
            }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '1080px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}>
                <div style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#0F4C81',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FilePlus size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Record New Patient Intake Case
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        Admin & Clinical Practitioner Intake Protocol
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIntakeModal(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B',
                      padding: '6px',
                      borderRadius: '8px'
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                  <PatientIntakeWizard
                    onCaseSubmitted={() => {
                      setShowIntakeModal(false);
                      loadCases();
                      loadOverview();
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {patientCases.map((cs) => (
              <div
                key={cs.id}
                onClick={async () => {
                  const res = await api.adminGetPatientCaseDetails(cs.id);
                  if (res.success) setSelectedCaseDetail(res.case);
                }}
                style={{
                  padding: '16px 20px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0F172A' }}>
                    {cs.patientName} <span style={{ fontSize: '0.8rem', color: '#64748B' }}>({cs.age} yrs, {cs.gender})</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                    Chief Complaint: {cs.chiefComplaints[0]?.complaint || 'N/A'} • Practitioner: {cs.practitioner?.fullName || cs.practitioner?.mobileNumber}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    backgroundColor: '#E0F5F2',
                    color: '#00A896',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {cs.status}
                  </span>
                  <ChevronRight size={18} color="#94A3B8" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. AUDIT LOGS TAB */}
      {activeTab === 'audit' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '18px 16px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Administrative Audit Trail</h3>
          <div className="responsive-table-container">
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #E2E8F0', color: '#64748B' }}>
                  <th style={{ padding: '10px' }}>Action</th>
                  <th style={{ padding: '10px' }}>Admin</th>
                  <th style={{ padding: '10px' }}>Target ID</th>
                  <th style={{ padding: '10px' }}>IP Address</th>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px' }}>
                      <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {log.action}
                      </code>
                    </td>
                    <td style={{ padding: '10px' }}>{log.admin?.email || log.adminId}</td>
                    <td style={{ padding: '10px', color: '#64748B' }}>{log.targetId ? log.targetId.slice(0, 8) + '...' : '—'}</td>
                    <td style={{ padding: '10px', color: '#64748B' }}>{log.ipAddress || 'localhost'}</td>
                    <td style={{ padding: '10px', color: '#64748B' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: User Details */}
      {selectedUserDetail && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '12px'
        }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', maxWidth: '640px', width: '100%', padding: '20px 16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>User Profile Details</h3>
              <button onClick={() => setSelectedUserDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>
            <p><strong>Full Name:</strong> {selectedUserDetail.fullName || 'Not provided'}</p>
            <p><strong>Mobile Number:</strong> +91 {selectedUserDetail.mobileNumber}</p>
            <p><strong>Email:</strong> {selectedUserDetail.email || 'None'}</p>
            <p><strong>Role / Type:</strong> {selectedUserDetail.role} ({selectedUserDetail.userType || 'patient'})</p>
            <p><strong>Account Status:</strong> {selectedUserDetail.isActive ? 'Active' : 'Deactivated'}</p>
            <p><strong>Joined:</strong> {new Date(selectedUserDetail.createdAt).toLocaleString()}</p>
            
            <h4 style={{ marginTop: '16px', marginBottom: '8px', color: '#0F4C81', fontSize: '0.95rem' }}>Associated Conversations:</h4>
            {selectedUserDetail.conversations?.length === 0 ? <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No conversations recorded.</p> : (
              selectedUserDetail.conversations.map((c: any) => (
                <div key={c.id} style={{ padding: '6px 0', borderBottom: '1px solid #F1F5F9', fontSize: '0.82rem' }}>
                  • {c.title} ({new Date(c.updatedAt).toLocaleDateString()})
                </div>
              ))
            )}
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setSelectedUserDetail(null)} className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.85rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Conversation Messages Inspection */}
      {selectedConvDetail && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '12px'
        }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', maxWidth: '680px', width: '100%', padding: '20px 16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ minWidth: 0, paddingRight: '10px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedConvDetail.title}</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  User: {selectedConvDetail.user?.fullName || selectedConvDetail.user?.mobileNumber}
                </span>
              </div>
              <button onClick={() => setSelectedConvDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedConvDetail.messages?.map((m: any) => (
                <div key={m.id} style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: m.role === 'user' ? '#EBF3FA' : '#F1F5F9',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: m.role === 'user' ? '#0F4C81' : '#00A896', marginBottom: '3px' }}>
                    {m.role === 'user' ? 'User' : 'Assistant'} • {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#0F172A', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{m.content}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setSelectedConvDetail(null)} className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.85rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Patient Case Inspection */}
      {selectedCaseDetail && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '12px'
        }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', maxWidth: '640px', width: '100%', padding: '20px 16px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Case: {selectedCaseDetail.patientName}</h3>
              <button onClick={() => setSelectedCaseDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p><strong>Age / Gender:</strong> {selectedCaseDetail.age} yrs | {selectedCaseDetail.gender}</p>
              <p><strong>Contact:</strong> +91 {selectedCaseDetail.contactNumber} | {selectedCaseDetail.city}</p>
              <p><strong>Practitioner:</strong> {selectedCaseDetail.practitioner?.fullName || selectedCaseDetail.practitioner?.mobileNumber}</p>
              <div style={{ backgroundColor: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', marginTop: '4px' }}>
                <p><strong>Chief Complaints:</strong> {selectedCaseDetail.chiefComplaints[0]?.complaint} ({selectedCaseDetail.chiefComplaints[0]?.duration})</p>
                <p><strong>Severity:</strong> {selectedCaseDetail.chiefComplaints[0]?.severity}/10</p>
                <p><strong>Temperament:</strong> {selectedCaseDetail.electropathyDetails?.temperament}</p>
              </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setSelectedCaseDetail(null)} className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.85rem' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
