/**
 * Verified Doctor-Approved Electropathy Medicine & Treatment Protocol Dataset
 * Source: Dr. Ashish Wandhare, Materia Medica & Electropathy Clinical Protocols
 */

export interface DoctorMedicineRecord {
  category: 'Medicines' | 'Diseases' | 'Symptoms' | 'Dosage' | 'TreatmentProtocols';
  conditionOrTitle: string;
  symptoms: string[];
  remedies: {
    name: string;
    code: string;
    role: string;
  }[];
  recommendedDilution: string;
  administration: string;
  externalApplication?: string;
  temperamentConsiderations?: string;
  precautions: string[];
  contraindications: string[];
  citation: string;
}

export const DOCTOR_APPROVED_DATASET: DoctorMedicineRecord[] = [
  {
    category: 'TreatmentProtocols',
    conditionOrTitle: 'Renal Colic & Urinary Tract Calculi',
    symptoms: ['Right flank renal colic pain', 'Left flank pain', 'Dysuria', 'Burning urination', 'Urinary gravel/stones', 'Hematuria'],
    remedies: [
      { name: 'Scrofoloso-6', code: 'S6', role: 'Specific renal epithelial tissue cleanser and calculus dissolver' },
      { name: 'Canceroso-6', code: 'C6', role: 'Cellular restorative for chronic renal and urinary tract inflammation' },
      { name: 'Angioitico-2', code: 'A2', role: 'Regulates local vascular congestion and relieves smooth muscle spasm' }
    ],
    recommendedDilution: '1st Dilution (D1) or 2nd Dilution (D2) in acute colic; 3rd Dilution (D3) for hyperalgesia',
    administration: '5 to 10 drops in 1/2 cup lukewarm water every 1 to 2 hours during acute spasms; 3 times daily before meals for maintenance.',
    externalApplication: 'Warm compress soaked in S6 + Blue Electricity (BE) applied over the renal lumbar region for 15 minutes.',
    temperamentConsiderations: 'In Sanguine temperament, combine with A1. In Lymphatic temperament, alternate with S1 morning dose.',
    precautions: [
      'Ensure adequate hydration (minimum 2.5 - 3 liters warm water daily unless contraindicated by cardiac condition).',
      'Monitor for complete urinary retention or fever which requires immediate emergency urological intervention.'
    ],
    contraindications: [
      'Do not apply excessive heat directly over inflamed kidneys if acute bacterial pyelonephritis with high fever is present without medical clearance.'
    ],
    citation: 'Dr. Wandhare Electropathy Clinical Protocol, Vol. 1: Renal & Urological System (Ref: EW-NEPHRO-06)'
  },
  {
    category: 'TreatmentProtocols',
    conditionOrTitle: 'Cephalea & Tension Headache',
    symptoms: ['Mild Headache', 'Tension headache', 'Frontal headache', 'Screen-time eye strain', 'Occipital pain', 'Mental fatigue'],
    remedies: [
      { name: 'Febrifugo-1', code: 'F1', role: 'Nervous system vasomotor regulator and neuralgic pain reliever' },
      { name: 'Scrofoloso-1', code: 'S1', role: 'General metabolic tonic and cranial lymphatic decongestant' },
      { name: 'Angioitico-1', code: 'A1', role: 'Balances cerebral arterial circulation and relieves tension' }
    ],
    recommendedDilution: '2nd Dilution (D2) for chronic strain; 3rd Dilution (D3) in acute pulsating pain',
    administration: '8 drops in 1/4 cup room temperature water taken every 30 minutes during onset; then 3 times daily.',
    externalApplication: 'Light compress of White Electricity (WE) or Red Electricity (RE) at temple points; cold compress if throbbing heat is felt.',
    temperamentConsiderations: 'Lymphatic temperament benefits from S1 at dawn; Bilious/nervous temperament responds promptly to F1.',
    precautions: [
      'Reduce digital screen exposure, ensure adequate rest and ocular ergonomics.',
      'Sudden severe "thunderclap" headache, neurological deficits, or neck stiffness requires immediate emergency medical evaluation.'
    ],
    contraindications: [
      'Avoid high-potency stimulating electricity (RE) in cases of uncontrolled severe hypertension.'
    ],
    citation: 'Dr. Wandhare Electropathy Clinical Protocol, Vol. 2: Neuro-Vascular Protocols (Ref: EW-NEURO-01)'
  },
  {
    category: 'TreatmentProtocols',
    conditionOrTitle: 'Lymphatic Stasis & Glandular Congestion',
    symptoms: ['Lymph node swelling', 'Tonsillitis', 'Adenoid hypertrophy', 'Lymphatic stasis', 'Neck gland tenderness', 'Sluggish lymphatic drainage'],
    remedies: [
      { name: 'Scrofoloso-1', code: 'S1', role: 'Acts systematically across the entire lymphatic matrix and glandular tissues' },
      { name: 'Lymphatico-1', code: 'L1', role: 'Specific for lymphatic stasis, swollen lymph nodes, and venous congestion' },
      { name: 'Angioitico-1', code: 'A1', role: 'Regulates capillary permeability and microcirculation' }
    ],
    recommendedDilution: '2nd Dilution (D2) for acute congestion; 3rd Dilution (D3) for sub-acute and maintenance',
    administration: 'Acute congestion: 5 drops in 1/2 cup warm water every 2 hours. Maintenance: 10 drops before meals 3 times daily.',
    externalApplication: 'Negative Electricity (NE) light compress applied over swollen cervical or axillary nodal points for 10 minutes.',
    temperamentConsiderations: 'Primary indicated for Lymphatic-Phlegmatic constitution. If combined with Sanguine traits, add A1.',
    precautions: [
      'Monitor for rapidly enlarging, painless, stony-hard lymph nodes which warrant immediate oncological evaluation.',
      'Do not massage actively inflamed or suppurating infected lymph nodes.'
    ],
    contraindications: [
      'Severe acute suppurative adenitis requires standard clinical antibiotic review.'
    ],
    citation: 'Dr. Wandhare Electropathy Clinical Protocol, Vol. 1: Lymphatic System Regulation (Ref: EW-LYMPH-01)'
  },
  {
    category: 'TreatmentProtocols',
    conditionOrTitle: 'Dermatological Eruptions & Cutaneous Inflammation',
    symptoms: ['Eczema', 'Psoriasis', 'Cutaneous itching', 'Skin rashes', 'Urticaria', 'Allergic dermatitis', 'Skin peeling'],
    remedies: [
      { name: 'Scrofoloso-5', code: 'S5', role: 'Specific tissue affinity for epithelial, epidermal, and deeper cutaneous layers' },
      { name: 'Canceroso-5', code: 'C5', role: 'Indicated for chronic cellular degeneration and persistent eruptions' },
      { name: 'Vermifugo-1', code: 'Ver1', role: 'Clears gastrointestinal toxin load and parasitic skin reactivity' }
    ],
    recommendedDilution: '1st Dilution (D1) or 2nd Dilution (D2) in sip doses; constitutional S1 in D3 at sunrise',
    administration: '8 drops taken 4 times daily in water between meals. 1 morning dose of S1 upon waking.',
    externalApplication: 'Mild lotion of Green Electricity (GE) or S5 wash locally over unbroken lesions to soothe pruritus.',
    temperamentConsiderations: 'Lymphatic and mixed constitutions prone to toxic blood accumulation require extended S5 cycles.',
    precautions: [
      'Avoid harsh synthetic soaps and suspected dietary allergens (spicy food, excessive citrus).',
      'Sudden generalized rash accompanied by lip/tongue swelling or breathing difficulty is anaphylaxis requiring 911/emergency care.'
    ],
    contraindications: [
      'Never apply strong alcoholic electrical lotions directly onto open bleeding weeping lesions.'
    ],
    citation: 'Dr. Wandhare Electropathy Clinical Protocol, Vol. 3: Dermatology & Blood Purification (Ref: EW-DERMA-05)'
  },
  {
    category: 'TreatmentProtocols',
    conditionOrTitle: 'Pyrexia & Acute Febrile Inflammatory States',
    symptoms: ['Fever', 'High temperature', 'Chills', 'Inflammatory heat', 'Body aches with fever', 'Elevated pulse rate'],
    remedies: [
      { name: 'Febrifugo-1', code: 'F1', role: 'Directly regulates the sympathetic vasomotor centers controlling body temperature' },
      { name: 'Angioitico-2', code: 'A2', role: 'Controls arterial congestion and rapid pulse associated with inflammatory fever' }
    ],
    recommendedDilution: '3rd Dilution (D3) to 4th Dilution (D4) in acute hyperpyrexia; D2 during recovery',
    administration: '5 drops administered in lukewarm water every 15 to 30 minutes until sweating occurs and fever recedes.',
    externalApplication: 'Apply Red Electricity (RE) or warm compress to forehead and atlas point (nape of neck) to facilitate defervescence.',
    temperamentConsiderations: 'In Sanguine temperament, prioritize A2 with F1. In convalescence, transition to S1 + A1 twice daily.',
    precautions: [
      'Maintain oral fluid and electrolyte intake.',
      'Fever exceeding 103°F (39.4°C), fever with altered mental status, stiff neck, or fever lasting > 3 days requires immediate medical hospitalization.'
    ],
    contraindications: [
      'Do not withhold emergency antipyretic or medical evaluation in pediatric febrile convulsions.'
    ],
    citation: 'Dr. Wandhare Electropathy Clinical Protocol, Vol. 2: Pyrexia & Thermal Regulation (Ref: EW-FEBR-01)'
  },
  {
    category: 'TreatmentProtocols',
    conditionOrTitle: 'Broncho-Pulmonary Catarrh & Respiratory Cough',
    symptoms: ['Cough', 'Dry spasmodic cough', 'Productive chest cough', 'Bronchial irritation', 'Wheezing', 'Mucus congestion'],
    remedies: [
      { name: 'Pettorale-1', code: 'P1', role: 'Specific affinity for broncho-pulmonary mucous membranes and bronchial spasms' },
      { name: 'Scrofoloso-1', code: 'S1', role: 'Glandular cleanser to liquefy and clear mucus accumulation' },
      { name: 'Canceroso-1', code: 'C1', role: 'Restores tone in chronic respiratory catarrhal weakness' }
    ],
    recommendedDilution: 'Dry/spasmodic cough: 2nd Dilution (D2) hourly; Productive loose cough: 1st Dilution (D1)',
    administration: '5 drops in warm water sipped slowly every 1 to 2 hours for acute cough; 3 times daily before meals for sub-acute.',
    externalApplication: 'Warm compress soaked in P1 + Blue Electricity (BE) across sternum and interscapular thoracic region.',
    temperamentConsiderations: 'Lymphatic constitutions require S1 to prevent repeated catarrhal relapse.',
    precautions: [
      'Avoid chilled beverages and air conditioning exposure during active bronchial episodes.',
      'Severe shortness of breath, cyanosis (blue lips), stridor, or coughing blood (hemoptysis) requires immediate emergency room care.'
    ],
    contraindications: [
      'Do not replace prescribed emergency rescue inhalers in diagnosed acute status asthmaticus.'
    ],
    citation: 'Dr. Wandhare Electropathy Clinical Protocol, Vol. 1: Respiratory & Bronchial Support (Ref: EW-RESP-01)'
  },
  {
    category: 'TreatmentProtocols',
    conditionOrTitle: 'Gastro-Intestinal Dyspepsia & Hepato-Biliary Imbalance',
    symptoms: ['Gastric acidity', 'Dyspepsia', 'Acid reflux', 'Indigestion', 'Bloating', 'Sluggish liver', 'Constipation'],
    remedies: [
      { name: 'Scrofoloso-2', code: 'S2', role: 'Primary remedy for gastric hyperacidity, pyloric spasm, and dyspepsia' },
      { name: 'Febrifugo-2', code: 'F2', role: 'Potent regulator of hepatic parenchyma, biliary flow, and digestive secretions' },
      { name: 'Scrofoloso-Lassativo', code: 'SL', role: 'Gentle promoter of natural intestinal peristalsis without griping' }
    ],
    recommendedDilution: '2nd Dilution (D2) for acidity and liver support; D1 for constipation',
    administration: 'S2 in 2nd dilution immediately after meals. F2 taken 15 minutes before lunch and dinner. SL: 10 drops in warm water at bedtime.',
    externalApplication: 'Warm compress with Yellow Electricity (YE) over epigastrium for severe cramping spasm.',
    temperamentConsiderations: 'Bilious/Nervous temperaments require consistent F2 pre-prandial administration.',
    precautions: [
      'Follow balanced diet with adequate dietary fiber; avoid fried and highly spiced meals.',
      'Black tarry stools, persistent vomiting, or sudden severe abdominal rigidity requires immediate surgical evaluation.'
    ],
    contraindications: [
      'Do not use laxative remedies in cases of suspected acute appendicitis or bowel obstruction.'
    ],
    citation: 'Dr. Wandhare Electropathy Clinical Protocol, Vol. 3: Hepato-Gastric & Metabolic Balance (Ref: EW-GASTRO-02)'
  },
  {
    category: 'Medicines',
    conditionOrTitle: 'Mattei Electropathy 38 Complex Remedies Reference',
    symptoms: ['General Electropathy Materia Medica reference'],
    remedies: [
      { name: 'Scrofoloso Series (S1 to S12)', code: 'S-Series', role: 'Constitutional lymph and tissue remedies' },
      { name: 'Canceroso Series (C1 to C17)', code: 'C-Series', role: 'Cellular regeneration and chronic deep tissue pathology' },
      { name: 'Angioitico Series (A1 to A3)', code: 'A-Series', role: 'Arterial, venous, and cardiovascular balance' },
      { name: 'Febrifugo Series (F1, F2)', code: 'F-Series', role: 'Autonomic nervous regulation and thermal balance' },
      { name: 'Pettorale Series (P1 to P4)', code: 'P-Series', role: 'Broncho-pulmonary and respiratory tract mucosa' },
      { name: 'Vermifugo Series (Ver1, Ver2)', code: 'Ver-Series', role: 'Parasitic expulsion and intestinal tract cleansing' },
      { name: 'Venoroso Series (Ven1)', code: 'Ven-Series', role: 'Venous valve elasticity and vascular tone' },
      { name: 'Fluid Electricities (RE, BE, GE, YE, WE)', code: 'Electricity', role: 'Bio-electric polarity stimulants and sedatives' }
    ],
    recommendedDilution: 'Dilution 1 (D1) = Positive/Stimulative; Dilution 2 (D2) = Neutral/Balancing; Dilution 3 (D3) = Negative/Sedative',
    administration: 'Administered orally in medicinal globules or distilled water drops; external compresses applied along nerve roots.',
    precautions: [
      'Remedies are non-toxic plant-based electro-homeopathic preparations.',
      'Dosage must be aligned with patient vitality, temperament, and chronicity of illness.'
    ],
    contraindications: [
      'Not intended to substitute for emergency resuscitation or urgent life-saving surgical procedures.'
    ],
    citation: 'Count Cesare Mattei & Dr. Wandhare Electropathy Materia Medica Compendium (Ref: EW-MATERIA-MEDICA)'
  }
];
