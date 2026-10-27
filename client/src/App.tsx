import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { PatientIntakeWizard } from './components/PatientIntakeWizard';
import { CaseHistoryList } from './components/CaseHistoryList';
import { ChatHistoryView } from './components/ChatHistoryView';
import { AdminPortal } from './components/AdminPortal';
import { MedicalDisclaimer } from './components/MedicalDisclaimer';
import { api } from './services/api';
import { User, PatientCase } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentLang, setCurrentLang] = useState('en');
  const [activeTab, setActiveTab] = useState<'records' | 'chat'>('chat');
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check URL routing for authorized admin interface
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const search = window.location.search.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || search.includes('admin') || hash === '#admin') {
        setIsAdminRoute(true);
      } else {
        setIsAdminRoute(false);
      }
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  useEffect(() => {
    // Check if previously logged in as user
    const checkAuth = async () => {
      const token = localStorage.getItem('electropathy_token');
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            setCurrentLang(res.user.preferredLang || 'en');
          } else {
            await api.logout();
            setUser(null);
          }
        } catch {
          await api.logout();
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCurrentLang(authenticatedUser.preferredLang || 'en');
    setActiveTab('chat'); // Immediately show their personal saved consultation history upon login!
  };

  const handleAdminSuccess = (_admin: any) => {
    setIsAdminRoute(true);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setActiveTab('chat');
  };

  const handleExitAdmin = () => {
    setIsAdminRoute(false);
    if (window.location.pathname === '/admin' || window.location.search.includes('admin') || window.location.hash === '#admin') {
      window.history.pushState({}, '', '/');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#0F4C81', fontWeight: 600 }}>Loading Electropathy AI Portal...</div>
      </div>
    );
  }

  const isChatActive = Boolean(user && activeTab === 'chat');

  // Admin Portal Route (Authorized administration interface only)
  if (isAdminRoute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main style={{ flex: 1, padding: '8px 16px 40px', display: 'flex', flexDirection: 'column' }}>
          <AdminPortal onBackToApp={handleExitAdmin} />
        </main>
      </div>
    );
  }

  return (
    <div style={{ 
      height: isChatActive ? '100vh' : undefined,
      minHeight: '100vh',
      maxHeight: isChatActive ? '100vh' : undefined,
      overflow: isChatActive ? 'hidden' : 'auto',
      display: 'flex', 
      flexDirection: 'column' 
    }}>
      <Navbar
        user={user}
        currentLang={currentLang}
        onLanguageChange={(lang) => setCurrentLang(lang)}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      <main 
        className={`app-main-content ${user ? 'has-user' : ''}`}
        style={{ 
          flex: 1, 
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: isChatActive ? 'hidden' : 'visible',
          padding: !user ? '8px 16px 0' : isChatActive ? '8px 16px 8px' : '20px' 
        }}
      >
        {!user ? (
          <LoginModal 
            onSuccess={handleLoginSuccess} 
            onAdminSuccess={handleAdminSuccess}
          />
        ) : (
          <>
            {activeTab === 'records' && (
              <CaseHistoryList key={user.id} user={user} />
            )}
            {activeTab === 'chat' && (
              <ChatHistoryView key={user.id} user={user} />
            )}
          </>
        )}
      </main>

      {!isChatActive && (
        <MedicalDisclaimer compact={!user} />
      )}
    </div>
  );
}
