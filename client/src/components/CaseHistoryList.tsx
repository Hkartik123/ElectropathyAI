import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PatientCase, User } from '../types';
import { Search, FileText, Calendar, MapPin, User as UserIcon, ChevronRight, Eye, ShieldCheck, Plus, Edit3, X } from 'lucide-react';
import { formatDisplayPhone } from '../utils/phone';
import { PatientIntakeWizard } from './PatientIntakeWizard';

interface CaseHistoryListProps {
  user?: User | null;
}

export const CaseHistoryList: React.FC<CaseHistoryListProps> = ({ user }) => {
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState<PatientCase | null>(null);
  const [editingCase, setEditingCase] = useState<PatientCase | null>(null);
  const [showWizardModal, setShowWizardModal] = useState(false);

  const isPractitioner = user?.role === 'practitioner';

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    setLoading(true);
    try {
      const res = await api.getPatientCases();
      if (res.success && res.cases) {
        setCases(res.cases);
      } else {
        setCases([]);
      }
    } catch (err) {
      console.error('Error fetching cases', err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = cases.filter(c => 
    c.patientName.toLowerCase().includes(search.toLowerCase()) ||
    c.contactNumber.includes(search) ||
    c.chiefComplaints[0]?.complaint.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1080px', margin: '16px auto', padding: '0 12px 60px' }}>
      {/* Header & Search */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {isPractitioner ? 'Recorded Patient Histories' : 'My Health Records'}
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#DEF7EC',
              color: '#059669',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '999px'
            }}>
              <ShieldCheck size={11} />
              <span>Isolated & Private</span>
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.82rem', marginTop: '4px' }}>
            {isPractitioner 
              ? `${cases.length} Total Clinical Records Recorded Under Your Practice`
              : user 
                ? `Confidential records registered to ID: ${formatDisplayPhone(user.mobileNumber)}`
                : 'Your confidential clinical intake records'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1 1 360px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%', flex: '1 1 200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search complaint, date, details..."
              style={{ paddingLeft: '38px', width: '100%' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              setEditingCase(null);
              setShowWizardModal(true);
            }}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              background: 'linear-gradient(135deg, #0F4C81 0%, #00A896 100%)'
            }}
          >
            <Plus size={16} />
            <span>+ Add History</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
          Loading clinical records...
        </div>
      ) : filteredCases.length === 0 ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 20px',
          textAlign: 'center',
          border: '1px solid #E2E8F0'
        }}>
          <FileText size={44} style={{ margin: '0 auto 14px', color: '#CBD5E1' }} />
          <h3 style={{ color: '#334155', marginBottom: '8px', fontSize: '1.1rem' }}>
            {isPractitioner ? 'No Patient Records Found' : 'No Health Records Found'}
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.84rem', maxWidth: '460px', margin: '0 auto' }}>
            {isPractitioner 
              ? 'Complete your first patient intake to build the clinical case database.'
              : 'You do not have any saved clinical records under this account yet. Consultation summaries will appear here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredCases.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCase(c)}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                padding: '16px 18px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: 'var(--shadow-sm)',
                flexWrap: 'wrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#00A896';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 240px', minWidth: 0 }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#EBF3FA',
                  color: '#0F4C81',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                  flexShrink: 0
                }}>
                  {c.patientName[0]?.toUpperCase()}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.patientName}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      ({c.age} yrs, {c.gender})
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: '#E0F5F2',
                      color: '#00A896',
                      padding: '2px 7px',
                      borderRadius: '12px',
                      textTransform: 'uppercase'
                    }}>
                      {c.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: '#475569', flexWrap: 'wrap' }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                      <strong>Complaint:</strong> {c.chiefComplaints[0]?.complaint || 'N/A'}
                    </span>
                    {c.city && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#64748B', fontSize: '0.76rem' }}>
                        <MapPin size={13} /> {c.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: 'auto' }}>
                <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#94A3B8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    <Calendar size={12} />
                    {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                  <div>ID: {c.id.slice(0, 8)}</div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCase(c);
                    setShowWizardModal(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#F0FDFA',
                    border: '1px solid #5EEAD4',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.74rem',
                    color: '#0F766E',
                    cursor: 'pointer',
                    fontWeight: 700,
                    transition: 'all 0.15s ease'
                  }}
                  title="Edit Case History"
                >
                  <Edit3 size={13} />
                  <span>Edit</span>
                </button>

                <ChevronRight size={18} color="#CBD5E1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Case Details Modal */}
      {selectedCase && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '12px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '20px 18px',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#0F172A', fontWeight: 800 }}>{selectedCase.patientName}</h3>
                <p style={{ color: '#64748B', fontSize: '0.78rem' }}>
                  Case ID: {selectedCase.id.slice(0, 8)} • Recorded {new Date(selectedCase.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748B', padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ color: '#0F4C81', marginBottom: '6px', fontSize: '0.9rem' }}>Demographics & Contact</h4>
                <p><strong>Age / Gender:</strong> {selectedCase.age} years | {selectedCase.gender}</p>
                <p><strong>Mobile Number:</strong> +91 {selectedCase.contactNumber}</p>
                <p><strong>Location:</strong> {selectedCase.city || 'Not provided'} | {selectedCase.occupation || 'N/A'}</p>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ color: '#0F4C81', marginBottom: '6px', fontSize: '0.9rem' }}>Chief Complaints</h4>
                <p><strong>Complaint:</strong> {selectedCase.chiefComplaints[0]?.complaint}</p>
                <p><strong>Duration:</strong> {selectedCase.chiefComplaints[0]?.duration || 'N/A'}</p>
                <p><strong>Pain Severity:</strong> {selectedCase.chiefComplaints[0]?.severity}/10</p>
                <p><strong>Modality / Factors:</strong> {selectedCase.chiefComplaints[0]?.factors || 'None noted'}</p>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '8px' }}>
                <h4 style={{ color: '#0F4C81', marginBottom: '6px', fontSize: '0.9rem' }}>Electropathy Constitution & Impressions</h4>
                <p><strong>Temperament:</strong> {selectedCase.electropathyDetails?.temperament || 'Not specified'}</p>
                <p><strong>Prior Remedies:</strong> {selectedCase.electropathyDetails?.previousElectropathy || 'None'}</p>
                <p><strong>Clinical Notes:</strong> {selectedCase.electropathyDetails?.notes || 'None'}</p>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setEditingCase(selectedCase);
                  setSelectedCase(null);
                  setShowWizardModal(true);
                }}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit3 size={15} />
                <span>Edit Case</span>
              </button>
              <button onClick={() => window.print()} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                Print Case
              </button>
              <button onClick={() => setSelectedCase(null)} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Modal for Add / Edit Case History */}
      {showWizardModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '920px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <PatientIntakeWizard
                initialCase={editingCase}
                currentUser={user}
                onCancel={() => setShowWizardModal(false)}
                onCaseSubmitted={async () => {
                  setShowWizardModal(false);
                  await loadCases();
                }}
                title={editingCase ? "Edit Patient Case Record" : "Add Patient Case Record"}
                submitButtonText={editingCase ? "Save & Update Record" : "Save Patient Intake Record"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
