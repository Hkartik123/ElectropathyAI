import React from 'react';
import { User } from '../types';
import { Activity, User as UserIcon, LogOut, Globe, FilePlus, FolderOpen, MessageSquare, CheckCircle } from 'lucide-react';
import { formatDisplayPhone } from '../utils/phone';

interface NavbarProps {
  user: User | null;
  currentLang: string;
  onLanguageChange: (lang: string) => void;
  onLogout: () => void;
  activeTab: 'records' | 'chat';
  onTabChange: (tab: 'records' | 'chat') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentLang,
  onLanguageChange,
  onLogout,
  activeTab,
  onTabChange,
}) => {
  return (
    <>
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '0 16px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          {/* Brand Logo */}
          <div 
            onClick={() => onTabChange('chat')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 3px 8px rgba(0, 168, 150, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
              flexShrink: 0
            }}>
              <img src="/favicon.svg" alt="Electropathy AI Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
                  Electropathy<span style={{ color: '#00A896' }}>AI</span>
                </span>
                <span className="hide-on-mobile" style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backgroundColor: '#EBF3FA',
                  color: '#0F4C81',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  Patient Portal
                </span>
              </div>
              <div className="hide-on-mobile" style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Personal Consultation & Health Records
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Desktop view) */}
          {user && (
            <nav className="hide-on-mobile" style={{ display: 'flex', gap: '6px', backgroundColor: '#F8FAFC', padding: '4px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              {/* Consultation History & Chat */}
              <button
                onClick={() => onTabChange('chat')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  fontSize: '0.84rem',
                  fontWeight: activeTab === 'chat' ? 700 : 600,
                  color: activeTab === 'chat' ? '#00A896' : '#64748B',
                  backgroundColor: activeTab === 'chat' ? '#FFFFFF' : 'transparent',
                  borderRadius: '7px',
                  border: activeTab === 'chat' ? '1px solid #BAE6FD' : '1px solid transparent',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'chat' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <MessageSquare size={15} color={activeTab === 'chat' ? '#00A896' : '#94A3B8'} />
                <span>Consultations & Chat</span>
              </button>

              {/* My Health Records */}
              <button
                onClick={() => onTabChange('records')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  fontSize: '0.84rem',
                  fontWeight: activeTab === 'records' ? 700 : 600,
                  color: activeTab === 'records' ? '#0F4C81' : '#64748B',
                  backgroundColor: activeTab === 'records' ? '#FFFFFF' : 'transparent',
                  borderRadius: '7px',
                  border: activeTab === 'records' ? '1px solid #CBD5E1' : '1px solid transparent',
                  cursor: 'pointer',
                  boxShadow: activeTab === 'records' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <FolderOpen size={15} color={activeTab === 'records' ? '#0F4C81' : '#94A3B8'} />
                <span>My Health Records</span>
              </button>
            </nav>
          )}

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '4px 6px', borderRadius: '8px' }}>
              <Globe size={15} color="#64748B" />
              <select
                value={currentLang}
                onChange={(e) => onLanguageChange(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: '2px 0'
                }}
              >
                <option value="en">EN</option>
                <option value="hi">हिंदी</option>
                <option value="mr">मराठी</option>
              </select>
            </div>

            {/* User profile with verified phone account identifier */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#0F4C81',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {user.fullName ? user.fullName[0]?.toUpperCase() : <UserIcon size={14} />}
                  </div>
                  <div className="hide-on-mobile" style={{ textAlign: 'left', lineHeight: 1.2 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                      {user.fullName || formatDisplayPhone(user.mobileNumber)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.66rem', color: '#00A896', fontWeight: 600 }}>
                      <CheckCircle size={9} color="#00A896" />
                      <span>{formatDisplayPhone(user.mobileNumber)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  title="Logout"
                  style={{
                    background: 'none',
                    border: '1px solid #E2E8F0',
                    padding: '6px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* Dynamic Mobile Bottom Navigation Bar (Visible on mobile when logged in) */}
      {user && (
        <nav className="mobile-bottom-nav show-on-mobile">
          <button
            onClick={() => onTabChange('chat')}
            className={`mobile-nav-item ${activeTab === 'chat' ? 'active accent' : ''}`}
          >
            <MessageSquare size={20} />
            <span>Consultations</span>
          </button>

          <button
            onClick={() => onTabChange('records')}
            className={`mobile-nav-item ${activeTab === 'records' ? 'active' : ''}`}
          >
            <FolderOpen size={20} />
            <span>Health Records</span>
          </button>
        </nav>
      )}
    </>
  );
};
