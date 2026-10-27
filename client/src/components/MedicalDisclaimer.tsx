import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface MedicalDisclaimerProps {
  compact?: boolean;
}

export const MedicalDisclaimer: React.FC<MedicalDisclaimerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <footer style={{
        marginTop: '6px',
        padding: '4px 16px 8px',
        color: '#64748B',
        fontSize: '0.72rem',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#FEF3C7',
          border: '1px solid #FCD34D',
          color: '#92400E',
          padding: '6px 12px',
          borderRadius: '6px',
          textAlign: 'left',
          lineHeight: 1.3
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>Medical Notice:</strong> Electropathy AI is an informational and clinical decision-support application built exclusively from verified datasets authorized by Dr. Ashish Wandhare. Final medical judgment resides solely with the licensed practitioner.
          </div>
        </div>
        <div style={{ marginTop: '4px', fontSize: '0.68rem', color: '#94A3B8' }}>
          © 2026 Electropathy AI – Developed by NKSKILLEDGE PRIVATE LIMITED for Dr. Ashish Wandhare. All Rights Reserved.
        </div>
      </footer>
    );
  }

  return (
    <footer className="app-footer-user" style={{
      marginTop: '40px',
      borderTop: '1px solid #E2E8F0',
      backgroundColor: '#FFFFFF',
      padding: '18px 16px',
      color: '#64748B',
      fontSize: '0.8rem',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '860px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#FEF3C7',
        border: '1px solid #FCD34D',
        color: '#92400E',
        padding: '10px 16px',
        borderRadius: '8px',
        textAlign: 'left',
        lineHeight: 1.4
      }}>
        <AlertTriangle size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Medical Notice:</strong> Electropathy AI is an informational and clinical decision-support application built exclusively from verified datasets authorized by Dr. Ashish Wandhare. It does not provide autonomous diagnosis or unsupervised prescription. Final medical judgment resides solely with the licensed practitioner.
        </div>
      </div>
      <div style={{ marginTop: '10px', fontSize: '0.72rem', color: '#94A3B8' }}>
        © 2026 Electropathy AI – Developed by NKSKILLEDGE PRIVATE LIMITED for Dr. Ashish Wandhare. All Rights Reserved.
      </div>
    </footer>
  );
};
