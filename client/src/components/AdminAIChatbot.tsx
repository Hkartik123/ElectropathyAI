import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { MarkdownMessage } from './MarkdownMessage';
import { 
  Bot, 
  User, 
  Send, 
  Search, 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  AlertTriangle, 
  FileText, 
  BookOpen, 
  ShieldAlert, 
  Loader2, 
  RefreshCw, 
  ChevronRight, 
  ExternalLink,
  Layers,
  HeartPulse,
  Info
} from 'lucide-react';

interface PatientCandidate {
  id: string;
  patientName: string;
  contactNumber: string;
  age: number;
  gender: string;
  status: string;
  createdAt: string;
  practitioner?: { fullName?: string; mobileNumber?: string };
}

interface ChatMessage {
  id: string;
  sender: 'admin' | 'ai';
  text: string;
  timestamp: Date;
  patientProfile?: any;
  doctorDatasetMatches?: any[];
  missingInformation?: string[];
  criticalSafetyAlerts?: string[];
  model?: string;
  latencyMs?: number;
}

export const AdminAIChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient Selector State
  const [searchQuery, setSearchQuery] = useState('');
  const [patientCandidates, setPatientCandidates] = useState<PatientCandidate[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientCandidate | null>(null);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [patientSummary, setPatientSummary] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  const [knowledgeList, setKnowledgeList] = useState<any[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        id: 'welcome-msg',
        sender: 'ai',
        text: `### 🌿 Welcome to Electropathy AI Clinical Decision Support
I am your clinical assistant grounded in **PostgreSQL live patient records** and **Dr. Ashish Wandhare's approved Electropathy Materia Medica dataset**.

**How you can use me:**
- Select a patient above to review complete history, chief complaints, and allergies.
- Ask for cross-case record comparisons or missing clinical information.
- Query doctor-approved Electropathy remedies, dilutions, and precautions.
- Distinguish between verified doctor-provided protocols and general AI interpretation.

*Select a patient or click one of the suggested prompts below to begin.*`,
        timestamp: new Date(),
        missingInformation: [],
        criticalSafetyAlerts: []
      }
    ]);
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  // Load patient candidates when typing or opening dropdown
  const handleSearchPatients = async (query: string) => {
    setSearchQuery(query);
    setIsSearchingPatient(true);
    try {
      const res = await api.searchAdminPatients(query, 8);
      if (res.success && res.candidates) {
        setPatientCandidates(res.candidates);
      } else {
        setPatientCandidates([]);
      }
    } catch {
      setPatientCandidates([]);
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const handleSelectPatient = async (p: PatientCandidate) => {
    setSelectedPatient(p);
    setPatientDropdownOpen(false);
    setSearchQuery('');
    setLoadingSummary(true);

    try {
      const res = await api.getAdminPatientSummary(p.id);
      if (res.success && res.profile) {
        setPatientSummary(res.profile);
      }
    } catch (err) {
      console.error('Failed to load patient summary', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleClearPatient = () => {
    setSelectedPatient(null);
    setPatientSummary(null);
  };

  const handleSend = async (queryToSend?: string) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || loading) return;

    setError(null);
    setInputQuery('');

    const userMsg: ChatMessage = {
      id: `admin-${Date.now()}`,
      sender: 'admin',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.adminChat({
        query: text,
        patientId: selectedPatient?.id
      });

      if (res.success) {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: res.answer,
          timestamp: new Date(),
          patientProfile: res.patientProfile,
          doctorDatasetMatches: res.doctorDatasetMatches,
          missingInformation: res.missingInformation,
          criticalSafetyAlerts: res.criticalSafetyAlerts,
          model: res.model,
          latencyMs: res.latencyMs
        };
        setMessages(prev => [...prev, aiMsg]);

        // If returned profile has newer data, update summary
        if (res.patientProfile) {
          setPatientSummary(res.patientProfile);
        }
      } else {
        setError(res.message || 'Failed to process clinical inquiry.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while contacting the AI Clinical Engine.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadKnowledgeChunks = async () => {
    setLoadingKnowledge(true);
    try {
      const res = await api.getAdminKnowledge(1, 50);
      if (res.success && res.chunks) {
        setKnowledgeList(res.chunks);
      }
    } catch (err) {
      console.error('Failed to load knowledge', err);
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const suggestedPrompts = [
    { label: '📋 Comprehensive Case Summary', prompt: 'Generate a complete, structured case summary for this patient including chief complaints, duration, severity, and previous treatments.' },
    { label: '⚠️ Allergies & Missing Data', prompt: 'Identify all allergies, chronic conditions, and missing clinical information for this patient.' },
    { label: '🌿 Doctor-Approved Remedies', prompt: 'What doctor-approved Electropathy remedies, dilutions, and administration methods are indicated for the chief complaint?' },
    { label: '🔄 Compare Case History', prompt: 'Compare this patient\'s current case record with previous records. Highlight changes in symptoms or treatments.' },
    { label: '🚨 Triage & Red Flags', prompt: 'Evaluate whether any reported symptoms or medical history details represent emergency red flags requiring immediate medical evaluation.' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', gap: 10, overflow: 'hidden' }}>
      {/* Top Header / Mode Switcher */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '12px 18px',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid #E2E8F0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: 10, 
            backgroundColor: '#0F4C81', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <Bot size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0F2942' }}>
                AI Clinical Decision Support & Assistant
              </h2>
              <span style={{ 
                fontSize: 11, 
                fontWeight: 600, 
                backgroundColor: '#E0F2FE', 
                color: '#0369A1', 
                padding: '2px 8px', 
                borderRadius: 12 
              }}>
                Gemini 2.5 Flash + Live PostgreSQL
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>
              Doctor-Approved Dataset Grounding • Real-Time Database Verification • Audit-Logged Access
            </p>
          </div>
        </div>

        {/* Knowledge Base Browser Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'chat' ? '#0F4C81' : '#F1F5F9',
              color: activeTab === 'chat' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s ease'
            }}
          >
            Clinical Assistant
          </button>
          <button
            onClick={() => {
              setActiveTab('knowledge');
              if (knowledgeList.length === 0) loadKnowledgeChunks();
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              backgroundColor: activeTab === 'knowledge' ? '#0F4C81' : '#F1F5F9',
              color: activeTab === 'knowledge' ? '#FFFFFF' : '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={15} />
            Doctor's Dataset ({knowledgeList.length || '8'})
          </button>
        </div>
      </div>

      {activeTab === 'knowledge' ? (
        /* Doctor's Approved Dataset Explorer View */
        <div style={{ 
          flex: 1, 
          backgroundColor: '#FFFFFF', 
          borderRadius: 12, 
          padding: 20, 
          overflowY: 'auto',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0F2942' }}>
                Approved Doctor's Electropathy Medicine & Protocol Dataset
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#64748B' }}>
                Retrieved live from PostgreSQL <code style={{ backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>knowledge_chunks</code> table.
              </p>
            </div>
            <button
              onClick={loadKnowledgeChunks}
              disabled={loadingKnowledge}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} className={loadingKnowledge ? 'spin' : ''} />
              Refresh from Database
            </button>
          </div>

          {loadingKnowledge ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
              <Loader2 size={28} className="spin" style={{ margin: '0 auto 12px' }} />
              <div>Fetching approved knowledge chunks from PostgreSQL...</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {knowledgeList.map((chunk, idx) => (
                <div key={chunk.id || idx} style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: 16,
                  backgroundColor: '#F8FAFC',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ 
                      fontSize: 11, 
                      fontWeight: 700, 
                      color: '#0284C7', 
                      backgroundColor: '#E0F2FE', 
                      padding: '2px 8px', 
                      borderRadius: 12 
                    }}>
                      {chunk.category || 'Clinical Protocol'}
                    </span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>Chunk #{idx + 1}</span>
                  </div>
                  <h4 style={{ margin: '4px 0', fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
                    {chunk.metadata?.conditionOrTitle || 'Electropathy Protocol'}
                  </h4>
                  <pre style={{ 
                    margin: 0, 
                    fontSize: 12, 
                    color: '#334155', 
                    whiteSpace: 'pre-wrap', 
                    fontFamily: 'inherit',
                    backgroundColor: '#FFFFFF',
                    padding: 10,
                    borderRadius: 6,
                    border: '1px solid #E2E8F0',
                    maxHeight: 180,
                    overflowY: 'auto'
                  }}>
                    {chunk.content}
                  </pre>
                  <div style={{ fontSize: 11, color: '#64748B', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span>Ref: {chunk.metadata?.citation || chunk.fileName}</span>
                    <span style={{ color: '#16A34A', fontWeight: 600 }}>✔ Approved & Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Main Chat & Patient Context View */
        <div style={{ display: 'flex', flex: 1, gap: 12, overflow: 'hidden' }}>
          {/* Left/Main Column: Chat Interface */}
          <div style={{ 
            flex: 3, 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: '#FFFFFF', 
            borderRadius: 12, 
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            overflow: 'hidden'
          }}>
            {/* Patient Context Bar (Top of Chat) */}
            <div style={{ 
              padding: '10px 16px', 
              backgroundColor: '#F8FAFC', 
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                  Target Patient Context:
                </span>
                {selectedPatient ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    backgroundColor: '#E0F2FE', 
                    padding: '4px 10px', 
                    borderRadius: 20,
                    border: '1px solid #BAE6FD'
                  }}>
                    <HeartPulse size={14} color="#0284C7" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0369A1' }}>
                      {selectedPatient.patientName} ({selectedPatient.age}y, {selectedPatient.gender})
                    </span>
                    <span style={{ fontSize: 11, color: '#0284C7' }}>
                      • {selectedPatient.contactNumber}
                    </span>
                    <button
                      onClick={handleClearPatient}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: 2, 
                        display: 'flex', 
                        alignItems: 'center',
                        color: '#0369A1'
                      }}
                      title="Clear patient selection"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                    No patient locked. Questions will be answered using general medical knowledge & dataset.
                  </span>
                )}
              </div>

              {/* Patient Selector Button & Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    setPatientDropdownOpen(!patientDropdownOpen);
                    if (!patientDropdownOpen && patientCandidates.length === 0) {
                      handleSearchPatients('');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  <Search size={13} />
                  {selectedPatient ? 'Change Patient' : 'Select Patient'}
                </button>

                {patientDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    width: 340,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 8,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    border: '1px solid #CBD5E1',
                    zIndex: 50,
                    padding: 8
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 6, marginBottom: 6 }}>
                      <Search size={14} color="#94A3B8" style={{ margin: '0 6px' }} />
                      <input
                        type="text"
                        placeholder="Search by name, phone (+91), or case ID..."
                        value={searchQuery}
                        onChange={(e) => handleSearchPatients(e.target.value)}
                        autoFocus
                        style={{
                          width: '100%',
                          border: 'none',
                          outline: 'none',
                          fontSize: 12,
                          color: '#1E293B'
                        }}
                      />
                      {isSearchingPatient && <Loader2 size={13} className="spin" color="#0F4C81" />}
                    </div>

                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {patientCandidates.length === 0 ? (
                        <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
                          No matching patients found in database.
                        </div>
                      ) : (
                        patientCandidates.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPatient(p)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              backgroundColor: selectedPatient?.id === p.id ? '#F0F9FF' : 'transparent',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 2
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedPatient?.id === p.id ? '#F0F9FF' : 'transparent'}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                                {p.patientName}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B' }}>
                                {p.gender}, {p.age} yrs • {p.contactNumber}
                              </div>
                            </div>
                            <span style={{ 
                              fontSize: 10, 
                              fontWeight: 600, 
                              padding: '2px 6px', 
                              borderRadius: 4, 
                              backgroundColor: p.status === 'submitted' ? '#DCFCE7' : '#F1F5F9',
                              color: p.status === 'submitted' ? '#166534' : '#475569'
                            }}>
                              {p.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Thread */}
            <div ref={messagesContainerRef} className="custom-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender === 'admin' ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    marginBottom: 4, 
                    fontSize: 11, 
                    color: '#64748B' 
                  }}>
                    {msg.sender === 'admin' ? (
                      <>
                        <span style={{ fontWeight: 600, color: '#0F4C81' }}>Administrator</span>
                        <User size={13} />
                      </>
                    ) : (
                      <>
                        <Bot size={13} color="#0284C7" />
                        <span style={{ fontWeight: 600, color: '#0284C7' }}>Electropathy AI Assistant</span>
                        {msg.model && (
                          <span style={{ backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>
                            {msg.model} {msg.latencyMs ? `(${msg.latencyMs}ms)` : ''}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div
                    style={{
                      maxWidth: msg.sender === 'admin' ? '80%' : '95%',
                      backgroundColor: msg.sender === 'admin' ? '#0F4C81' : '#F8FAFC',
                      color: msg.sender === 'admin' ? '#FFFFFF' : '#1E293B',
                      padding: msg.sender === 'admin' ? '10px 14px' : '14px 18px',
                      borderRadius: 12,
                      border: msg.sender === 'admin' ? 'none' : '1px solid #E2E8F0',
                      boxShadow: msg.sender === 'admin' ? '0 2px 6px rgba(15,76,129,0.2)' : '0 1px 4px rgba(0,0,0,0.02)',
                      lineHeight: 1.55,
                      fontSize: 13.5
                    }}
                  >
                    {/* Render Text Content with full Markdown formatting */}
                    <MarkdownMessage content={msg.text} isUser={msg.sender === 'admin'} />

                    {/* Metadata Badges for AI Responses */}
                    {msg.sender === 'ai' && (
                      <div style={{ 
                        marginTop: 12, 
                        paddingTop: 10, 
                        borderTop: '1px solid #E2E8F0', 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        gap: 8,
                        fontSize: 11
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {msg.doctorDatasetMatches && msg.doctorDatasetMatches.length > 0 ? (
                            <span style={{ 
                              backgroundColor: '#DCFCE7', 
                              color: '#166534', 
                              fontWeight: 600, 
                              padding: '2px 8px', 
                              borderRadius: 4 
                            }}>
                              ✔ {msg.doctorDatasetMatches.length} Doctor Dataset Match(es)
                            </span>
                          ) : (
                            <span style={{ 
                              backgroundColor: '#FEF3C7', 
                              color: '#92400E', 
                              fontWeight: 500, 
                              padding: '2px 8px', 
                              borderRadius: 4 
                            }}>
                              No Doctor Dataset Match
                            </span>
                          )}

                          {msg.criticalSafetyAlerts && msg.criticalSafetyAlerts.length > 0 && (
                            <span style={{ 
                              backgroundColor: '#FEE2E2', 
                              color: '#991B1B', 
                              fontWeight: 600, 
                              padding: '2px 8px', 
                              borderRadius: 4 
                            }}>
                              🚨 {msg.criticalSafetyAlerts.length} Clinical Alert(s)
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'none',
                            border: '1px solid #CBD5E1',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          {copiedId === msg.id ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                          {copiedId === msg.id ? 'Copied' : 'Copy Summary'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 8, width: 'fit-content' }}>
                  <Loader2 size={16} className="spin animate-spin" color="#0F4C81" />
                  <span style={{ fontSize: 13, color: '#64748B' }}>
                    Querying PostgreSQL live records & verifying with Dr. Wandhare's dataset...
                  </span>
                </div>
              )}

              {error && (
                <div style={{ 
                  padding: '10px 14px', 
                  backgroundColor: '#FEF2F2', 
                  border: '1px solid #FECACA', 
                  borderRadius: 8, 
                  color: '#991B1B',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                  </div>
                  <button 
                    onClick={() => handleSend()}
                    style={{ background: 'none', border: '1px solid #991B1B', padding: '3px 8px', borderRadius: 4, color: '#991B1B', cursor: 'pointer', fontSize: 11 }}
                  >
                    Retry
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Quick Prompts */}
            <div style={{ 
              padding: '6px 14px', 
              backgroundColor: '#F8FAFC', 
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}>
              {suggestedPrompts.map((sp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(sp.prompt)}
                  disabled={loading}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 16,
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#334155',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <Sparkles size={11} color="#0F4C81" />
                  {sp.label}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <div style={{ padding: 12, borderTop: '1px solid #E2E8F0', display: 'flex', gap: 10 }}>
              <input
                ref={inputRef}
                type="text"
                placeholder={selectedPatient 
                  ? `Ask about ${selectedPatient.patientName}'s history, symptoms, or remedies...`
                  : 'Ask about any patient by name/phone, or general Electropathy remedies...'
                }
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  fontSize: 13,
                  color: '#1E293B'
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !inputQuery.trim()}
                style={{
                  padding: '0 18px',
                  backgroundColor: loading || !inputQuery.trim() ? '#94A3B8' : '#0F4C81',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  border: 'none',
                  cursor: loading || !inputQuery.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                {loading ? <Loader2 size={16} className="spin animate-spin" /> : <Send size={16} />}
                <span>{loading ? 'Consulting AI...' : 'Ask AI'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Patient Context & Clinical Summary Panel */}
          <div style={{ 
            flex: 1.5, 
            backgroundColor: '#FFFFFF', 
            borderRadius: 12, 
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: '1px solid #E2E8F0', 
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} color="#0F4C81" />
                <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0F2942' }}>
                  Live Patient Medical Record
                </h3>
              </div>
              {selectedPatient && (
                <button
                  onClick={() => handleSelectPatient(selectedPatient)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                  title="Refresh from PostgreSQL"
                >
                  <RefreshCw size={13} color="#64748B" className={loadingSummary ? 'spin' : ''} />
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
              {!selectedPatient ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94A3B8' }}>
                  <User size={36} color="#CBD5E1" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>No Patient Selected</div>
                  <p style={{ fontSize: 12, margin: '6px 0 12px 0' }}>
                    Select a patient from the top bar to inspect their verified live medical record, complaints, and allergies.
                  </p>
                </div>
              ) : loadingSummary ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748B' }}>
                  <Loader2 size={24} className="spin" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 12 }}>Loading latest records from PostgreSQL...</div>
                </div>
              ) : patientSummary ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12.5 }}>
                  {/* Demographics Card */}
                  <div style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F4C81' }}>
                      {patientSummary.patientName}
                    </div>
                    <div style={{ color: '#64748B', marginTop: 2 }}>
                      {patientSummary.gender}, {patientSummary.age} yrs • {patientSummary.contactNumber}
                    </div>
                    {patientSummary.city && (
                      <div style={{ color: '#64748B' }}>Location: {patientSummary.city}</div>
                    )}
                    <div style={{ marginTop: 6, fontSize: 11, color: '#0369A1' }}>
                      Total Case Submissions: <strong>{patientSummary.totalCases}</strong>
                    </div>
                  </div>

                  {/* Chief Complaints */}
                  <div>
                    <span style={{ fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 4 }}>
                      Chief Complaints:
                    </span>
                    {patientSummary.latestCase?.chiefComplaints?.map((c: any, i: number) => (
                      <div key={i} style={{ backgroundColor: '#F1F5F9', padding: '6px 8px', borderRadius: 6, marginBottom: 4 }}>
                        <div style={{ fontWeight: 600, color: '#0F2942' }}>
                          • {c.complaint || 'Unspecified'}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          Duration: {c.duration || 'N/A'} | Severity: {c.severity !== undefined ? `${c.severity}/10` : 'N/A'}
                        </div>
                        {c.factors && (
                          <div style={{ fontSize: 11, color: '#64748B' }}>Factors: {c.factors}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Allergies & Chronic Conditions */}
                  <div style={{ backgroundColor: '#FFFBEB', padding: 10, borderRadius: 8, border: '1px solid #FEF3C7' }}>
                    <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                      Allergies & Medical History:
                    </div>
                    <div style={{ fontSize: 12, color: '#78350F' }}>
                      <strong>Allergies:</strong> {patientSummary.latestCase?.pastMedical?.allergies?.length ? patientSummary.latestCase.pastMedical.allergies.join(', ') : 'None Reported'}
                    </div>
                    <div style={{ fontSize: 12, color: '#78350F', marginTop: 2 }}>
                      <strong>Chronic Conditions:</strong> {patientSummary.latestCase?.pastMedical?.chronicConditions?.length ? patientSummary.latestCase.pastMedical.chronicConditions.join(', ') : 'None Reported'}
                    </div>
                  </div>

                  {/* Previous Treatments */}
                  <div>
                    <span style={{ fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: 4 }}>
                      Prior Treatments & Response:
                    </span>
                    <div style={{ fontSize: 12, color: '#475569' }}>
                      {patientSummary.latestCase?.presentIllness?.previousTreatments || 'None documented'}
                    </div>
                    {patientSummary.latestCase?.presentIllness?.responseToTreatment && (
                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                        Response: {patientSummary.latestCase.presentIllness.responseToTreatment}
                      </div>
                    )}
                  </div>

                  {/* Electropathy Details */}
                  {patientSummary.latestCase?.electropathyDetails && (
                    <div style={{ backgroundColor: '#F0FDF4', padding: 8, borderRadius: 6, border: '1px solid #DCFCE7' }}>
                      <span style={{ fontWeight: 700, color: '#166534', display: 'block' }}>
                        Electropathy Assessment:
                      </span>
                      <div style={{ fontSize: 11.5, color: '#14532D' }}>
                        Temperament: {patientSummary.latestCase.electropathyDetails.temperament || 'Not assessed'}
                      </div>
                      {patientSummary.latestCase.electropathyDetails.notes && (
                        <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>
                          Notes: {patientSummary.latestCase.electropathyDetails.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detected Missing Info */}
                  {patientSummary.missingInformation?.length > 0 && (
                    <div style={{ backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                      <span style={{ fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 2 }}>
                        Missing Record Items:
                      </span>
                      {patientSummary.missingInformation.map((m: string, i: number) => (
                        <div key={i} style={{ fontSize: 11, color: '#B45309' }}>
                          • {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
