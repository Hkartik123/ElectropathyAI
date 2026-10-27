import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PatientCase, User } from '../types';
import { 
  ClipboardList, 
  User as UserIcon, 
  AlertCircle, 
  Stethoscope, 
  HeartPulse, 
  Activity, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Save,
  Printer,
  X
} from 'lucide-react';

interface PatientIntakeWizardProps {
  onCaseSubmitted: (newCase: PatientCase) => void;
  initialCase?: PatientCase | null;
  currentUser?: User | null;
  onCancel?: () => void;
  title?: string;
  submitButtonText?: string;
}

export const PatientIntakeWizard: React.FC<PatientIntakeWizardProps> = ({ 
  onCaseSubmitted, 
  initialCase, 
  currentUser, 
  onCancel,
  title,
  submitButtonText
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successCase, setSuccessCase] = useState<PatientCase | null>(null);

  // Form State
  const [patientName, setPatientName] = useState(initialCase?.patientName || currentUser?.fullName || '');
  const [age, setAge] = useState(initialCase?.age ? String(initialCase.age) : '');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>((initialCase?.gender as any) || 'male');
  const [contactNumber, setContactNumber] = useState(initialCase?.contactNumber || currentUser?.mobileNumber || '');
  const [city, setCity] = useState(initialCase?.city || '');
  const [occupation, setOccupation] = useState(initialCase?.occupation || '');

  // Chief complaints
  const [complaintText, setComplaintText] = useState(initialCase?.chiefComplaints?.[0]?.complaint || '');
  const [duration, setDuration] = useState(initialCase?.chiefComplaints?.[0]?.duration || '');
  const [severity, setSeverity] = useState(initialCase?.chiefComplaints?.[0]?.severity ?? 5);
  const [factors, setFactors] = useState(initialCase?.chiefComplaints?.[0]?.factors || '');

  // Present Illness
  const [illnessDescription, setIllnessDescription] = useState(initialCase?.presentIllness?.description || '');
  const [previousTreatments, setPreviousTreatments] = useState(initialCase?.presentIllness?.previousTreatments || '');
  const [treatmentResponse, setTreatmentResponse] = useState(initialCase?.presentIllness?.responseToTreatment || '');

  // Past medical
  const [chronicConditions, setChronicConditions] = useState<string[]>(initialCase?.pastMedical?.chronicConditions || []);
  const [surgeries, setSurgeries] = useState(initialCase?.pastMedical?.surgeries || '');
  const [allergies, setAllergies] = useState(
    Array.isArray(initialCase?.pastMedical?.allergies) 
      ? initialCase.pastMedical.allergies.join(', ') 
      : ''
  );

  // Lifestyle
  const [diet, setDiet] = useState(initialCase?.lifestyle?.diet || 'Vegetarian');
  const [sleep, setSleep] = useState(initialCase?.lifestyle?.sleep || 'Normal (6-8 hours)');
  const [appetite, setAppetite] = useState(initialCase?.lifestyle?.appetite || 'Good');
  const [stressLevel, setStressLevel] = useState(initialCase?.lifestyle?.stressLevel || 'Moderate');

  // Electropathy specifics
  const [temperament, setTemperament] = useState(initialCase?.electropathyDetails?.temperament || 'Lymphatic (Water/Phlegm)');
  const [previousElectropathy, setPreviousElectropathy] = useState(initialCase?.electropathyDetails?.previousElectropathy || '');
  const [clinicalNotes, setClinicalNotes] = useState(initialCase?.electropathyDetails?.notes || '');

  useEffect(() => {
    if (initialCase) {
      setPatientName(initialCase.patientName || '');
      setAge(initialCase.age ? String(initialCase.age) : '');
      setGender((initialCase.gender as any) || 'male');
      setContactNumber(initialCase.contactNumber || '');
      setCity(initialCase.city || '');
      setOccupation(initialCase.occupation || '');
      setComplaintText(initialCase.chiefComplaints?.[0]?.complaint || '');
      setDuration(initialCase.chiefComplaints?.[0]?.duration || '');
      setSeverity(initialCase.chiefComplaints?.[0]?.severity ?? 5);
      setFactors(initialCase.chiefComplaints?.[0]?.factors || '');
      setIllnessDescription(initialCase.presentIllness?.description || '');
      setPreviousTreatments(initialCase.presentIllness?.previousTreatments || '');
      setTreatmentResponse(initialCase.presentIllness?.responseToTreatment || '');
      setChronicConditions(initialCase.pastMedical?.chronicConditions || []);
      setSurgeries(initialCase.pastMedical?.surgeries || '');
      setAllergies(Array.isArray(initialCase.pastMedical?.allergies) ? initialCase.pastMedical.allergies.join(', ') : '');
      setDiet(initialCase.lifestyle?.diet || 'Vegetarian');
      setSleep(initialCase.lifestyle?.sleep || 'Normal (6-8 hours)');
      setAppetite(initialCase.lifestyle?.appetite || 'Good');
      setStressLevel(initialCase.lifestyle?.stressLevel || 'Moderate');
      setTemperament(initialCase.electropathyDetails?.temperament || 'Lymphatic (Water/Phlegm)');
      setPreviousElectropathy(initialCase.electropathyDetails?.previousElectropathy || '');
      setClinicalNotes(initialCase.electropathyDetails?.notes || '');
    } else {
      setPatientName(currentUser?.fullName || '');
      setContactNumber(currentUser?.mobileNumber || '');
    }
  }, [initialCase, currentUser]);

  const conditionOptions = [
    'Diabetes Mellitus', 'Hypertension (BP)', 'Thyroid Disorder', 
    'Bronchial Asthma', 'Arthritis / Joint Pain', 'Gastritis / Acidity', 
    'Kidney Calculus (Stones)', 'Skin Allergies / Eczema', 'Migraine'
  ];

  const toggleCondition = (cond: string) => {
    if (chronicConditions.includes(cond)) {
      setChronicConditions(chronicConditions.filter(c => c !== cond));
    } else {
      setChronicConditions([...chronicConditions, cond]);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: Partial<PatientCase> = {
        patientName: patientName.trim(),
        age: Number(age) || 0,
        gender,
        contactNumber: contactNumber.trim() || (currentUser?.mobileNumber || ''),
        city: city.trim(),
        occupation: occupation.trim(),
        chiefComplaints: [{
          complaint: complaintText.trim(),
          duration: duration.trim(),
          severity: Number(severity),
          factors: factors.trim()
        }],
        presentIllness: {
          description: illnessDescription.trim(),
          previousTreatments: previousTreatments.trim(),
          responseToTreatment: treatmentResponse.trim()
        },
        pastMedical: {
          chronicConditions,
          surgeries: surgeries.trim(),
          allergies: allergies.split(',').map(s => s.trim()).filter(Boolean)
        },
        lifestyle: {
          diet,
          sleep,
          appetite,
          stressLevel
        },
        electropathyDetails: {
          temperament,
          previousElectropathy: previousElectropathy.trim(),
          notes: clinicalNotes.trim()
        },
        status: 'submitted'
      };

      let res;
      if (initialCase && initialCase.id) {
        res = await api.updatePatientCase(initialCase.id, payload);
      } else {
        res = await api.createPatientCase(payload);
      }

      if (res.success && res.case) {
        setSuccessCase(res.case);
        onCaseSubmitted(res.case);
      } else {
        alert(res.message || 'Error saving case.');
      }
    } catch (err) {
      alert('Network error while saving case.');
    } finally {
      setSubmitting(false);
    }
  };

  if (successCase) {
    return (
      <div style={{
        maxWidth: '720px',
        margin: '40px auto',
        padding: '40px',
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 20px',
          borderRadius: '50%',
          backgroundColor: '#D1FAE5',
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CheckCircle size={36} />
        </div>
        
        <h2 style={{ fontSize: '1.75rem', color: '#0F172A', marginBottom: '8px' }}>
          Patient Intake Recorded Successfully!
        </h2>
        <p style={{ color: '#64748B', marginBottom: '28px' }}>
          Case ID: <strong style={{ color: '#0F4C81' }}>{successCase.id.slice(0, 8)}</strong> for <strong>{successCase.patientName}</strong> ({successCase.age} yrs, {successCase.gender}).
        </p>

        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'left',
          marginBottom: '28px'
        }}>
          <h4 style={{ fontSize: '1rem', marginBottom: '12px', color: '#0F4C81' }}>Summary Details:</h4>
          <p><strong>Chief Complaint:</strong> {successCase.chiefComplaints[0]?.complaint} ({successCase.chiefComplaints[0]?.duration})</p>
          <p><strong>Severity:</strong> {successCase.chiefComplaints[0]?.severity}/10</p>
          <p><strong>Temperament:</strong> {successCase.electropathyDetails?.temperament}</p>
          <p><strong>Contact:</strong> +91 {successCase.contactNumber} | {successCase.city}</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
          >
            <Printer size={18} />
            Print Case Summary
          </button>
          
          {onCancel ? (
            <button
              onClick={onCancel}
              className="btn btn-primary"
            >
              <CheckCircle size={18} />
              Continue to Consultation
            </button>
          ) : (
            <button
              onClick={() => {
                setSuccessCase(null);
                setCurrentStep(1);
                setPatientName('');
                setAge('');
                setContactNumber('');
                setComplaintText('');
              }}
              className="btn btn-primary"
            >
              + Intake Another Patient
            </button>
          )}
        </div>
      </div>
    );
  }

  const steps = [
    { num: 1, title: 'Demographics', icon: UserIcon },
    { num: 2, title: 'Chief Complaints', icon: AlertCircle },
    { num: 3, title: 'Present Illness', icon: Stethoscope },
    { num: 4, title: 'Medical History', icon: HeartPulse },
    { num: 5, title: 'Lifestyle & Vitals', icon: Activity },
    { num: 6, title: 'Electropathy Assessment', icon: ClipboardList }
  ];

  const wizardTitle = title || (initialCase ? 'Edit Patient Clinical History' : 'Clinical Patient History Intake');
  const wizardSubtitle = initialCase 
    ? `Updating clinical history & current symptoms for ${patientName || 'patient'}`
    : 'Standardized Electropathy Case Formulation & Diagnosis Support';

  return (
    <div style={{
      maxWidth: '860px',
      margin: '16px auto',
      backgroundColor: '#FFFFFF',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid #E2E8F0',
      overflow: 'hidden'
    }}>
      {/* Wizard Header */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: '#0F4C81',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <h2 style={{ color: '#FFFFFF', fontSize: '1.2rem', marginBottom: '2px' }}>
            {wizardTitle}
          </h2>
          <p style={{ color: '#93C5FD', fontSize: '0.85rem' }}>
            {wizardSubtitle}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>
            Step {currentStep} of 6
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              title="Close"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Tabs */}
      <div 
        className="hide-scrollbar"
        style={{
          display: 'flex',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.num;
          const isPassed = currentStep > s.num;
          return (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              style={{
                flex: 1,
                minWidth: '130px',
                padding: '14px 10px',
                border: 'none',
                background: isActive ? '#FFFFFF' : 'transparent',
                borderBottom: isActive ? '3px solid #00A896' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: isActive ? '#0F4C81' : isPassed ? '#10B981' : '#64748B',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.825rem'
              }}
            >
              <Icon size={16} />
              <span>{s.title}</span>
            </button>
          );
        })}
      </div>

      {/* Step Body */}
      <div style={{ padding: '20px 16px', minHeight: '340px' }}>
        
        {/* STEP 1: Demographics */}
        {currentStep === 1 && (
          <div className="fade-in wizard-form-grid">
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Patient Full Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter patient full name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="input-label">Age (in years) *</label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 42"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="1"
                max="120"
                required
              />
            </div>

            <div>
              <label className="input-label">Gender *</label>
              <select
                className="input-field"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="input-label">Mobile Number *</label>
              <input
                type="tel"
                className="input-field"
                placeholder="10-digit mobile number"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
              />
            </div>

            <div>
              <label className="input-label">City / Town</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Nagpur, Maharashtra"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Occupation</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Teacher, Farmer, IT Professional"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Chief Complaints */}
        {currentStep === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div>
              <label className="input-label">Primary Chief Complaints *</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Describe current primary complaints (e.g., Severe right flank pain, chronic digestive distress, joint swelling)..."
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                required
              />
            </div>

            <div className="wizard-form-grid">
              <div>
                <label className="input-label">Duration of Complaint</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., 2 weeks, 6 months, 3 years"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Severity Level: {severity}/10</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severity}
                  onChange={(e) => setSeverity(Number(e.target.value))}
                  style={{ width: '100%', height: '8px', cursor: 'pointer', accentColor: '#0F4C81' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                  <span>Mild (1-3)</span>
                  <span>Moderate (4-6)</span>
                  <span>Severe (7-10)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="input-label">Aggravating & Relieving Factors</label>
              <input
                type="text"
                className="input-field"
                placeholder="What makes symptoms worse or better? (e.g., Worse in cold weather, relieved by rest)"
                value={factors}
                onChange={(e) => setFactors(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 3: Present Illness */}
        {currentStep === 3 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="input-label">Detailed Progression of Illness</label>
              <textarea
                className="input-field"
                rows={4}
                placeholder="Onset (sudden or gradual), sequence of symptoms, triggers, daily patterns..."
                value={illnessDescription}
                onChange={(e) => setIllnessDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">Previous Treatments Taken</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Allopathic antibiotics, Ayurvedic churnas, Homeopathy"
                value={previousTreatments}
                onChange={(e) => setPreviousTreatments(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">Response to Previous Treatments</label>
              <input
                type="text"
                className="input-field"
                placeholder="Temporary relief, no response, side effects observed..."
                value={treatmentResponse}
                onChange={(e) => setTreatmentResponse(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 4: Medical History */}
        {currentStep === 4 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div>
              <label className="input-label">Known Chronic Conditions</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                {conditionOptions.map((cond) => {
                  const selected = chronicConditions.includes(cond);
                  return (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => toggleCondition(cond)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: selected ? '1.5px solid #0F4C81' : '1.5px solid #CBD5E1',
                        backgroundColor: selected ? '#EBF3FA' : '#FFFFFF',
                        color: selected ? '#0F4C81' : '#475569',
                        fontWeight: selected ? 700 : 500,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      {selected ? '✓ ' : '+ '} {cond}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="input-label">Past Surgeries or Major Illnesses</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Appendectomy in 2018, Cholecystectomy"
                value={surgeries}
                onChange={(e) => setSurgeries(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">Known Allergies (Medicines, Foods, Dust)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., Penicillin, Sulfa drugs, Peanuts, Pollen"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 5: Lifestyle */}
        {currentStep === 5 && (
          <div className="fade-in wizard-form-grid">
            <div>
              <label className="input-label">Dietary Habit</label>
              <select className="input-field" value={diet} onChange={(e) => setDiet(e.target.value)}>
                <option value="Vegetarian">Pure Vegetarian</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Ovo-Vegetarian">Eggetarian</option>
                <option value="Vegan">Vegan</option>
              </select>
            </div>

            <div>
              <label className="input-label">Sleep Pattern</label>
              <select className="input-field" value={sleep} onChange={(e) => setSleep(e.target.value)}>
                <option value="Normal (6-8 hours)">Normal (6-8 hours, restful)</option>
                <option value="Disturbed / Insomnia">Disturbed / Insomnia</option>
                <option value="Excessive (>9 hours)">Excessive Sleepiness</option>
              </select>
            </div>

            <div>
              <label className="input-label">Appetite & Digestion</label>
              <select className="input-field" value={appetite} onChange={(e) => setAppetite(e.target.value)}>
                <option value="Good">Normal / Good</option>
                <option value="Poor">Poor / Loss of Appetite</option>
                <option value="Excessive / Variable">Irregular / Bloating</option>
              </select>
            </div>

            <div>
              <label className="input-label">Stress Level</label>
              <select className="input-field" value={stressLevel} onChange={(e) => setStressLevel(e.target.value)}>
                <option value="Low">Low / Relaxed</option>
                <option value="Moderate">Moderate Daily Stress</option>
                <option value="High">Severe / Chronic Anxiety</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 6: Electropathy Assessment */}
        {currentStep === 6 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="input-label">Electropathy Temperament (प्रकृति / Temperament)</label>
              <select
                className="input-field"
                value={temperament}
                onChange={(e) => setTemperament(e.target.value)}
              >
                <option value="Lymphatic (Water/Phlegm)">Lymphatic Temperament (रस प्रधान / Water & Phlegm)</option>
                <option value="Sanguine (Blood/Air)">Sanguine Temperament (रक्त प्रधान / Blood & Circulatory)</option>
                <option value="Bilious (Bile/Fire)">Bilious Temperament (पित्त प्रधान / Bile & Digestive)</option>
                <option value="Nervous (Verve/Energy)">Nervous Temperament (वात प्रधान / Nervous system)</option>
                <option value="Mixed Constitution">Mixed Constitution (मिश्रित प्रकृति)</option>
              </select>
            </div>

            <div>
              <label className="input-label">Previous Electropathy Remedies Used (if any)</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., S1, C5, A2, Green Electricity (GE), Ven1"
                value={previousElectropathy}
                onChange={(e) => setPreviousElectropathy(e.target.value)}
              />
            </div>

            <div>
              <label className="input-label">Doctor's Clinical Impressions & Notes</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Add special observations, pulse, tongue diagnosis notes..."
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
              />
            </div>
          </div>
        )}

      </div>

      {/* Footer Navigation Buttons */}
      <div style={{
        padding: '14px 18px',
        backgroundColor: '#F8FAFC',
        borderTop: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="btn btn-secondary"
            disabled={currentStep === 1}
          >
            <ArrowLeft size={16} />
            Previous Step
          </button>
        </div>

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={() => {
              if (currentStep === 1 && (!patientName.trim() || !age || !contactNumber)) {
                alert('Please fill patient name, age, and contact number.');
                return;
              }
              setCurrentStep(prev => prev + 1);
            }}
            className="btn btn-primary"
          >
            <span>Next: {steps[currentStep]?.title}</span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-accent"
            disabled={submitting}
          >
            <Save size={18} />
            {submitting 
              ? (initialCase ? 'Updating Case Record...' : 'Saving Case Record...') 
              : (submitButtonText || (initialCase ? 'Update Patient Case History' : 'Complete & Record Intake'))}
          </button>
        )}
      </div>
    </div>
  );
};
