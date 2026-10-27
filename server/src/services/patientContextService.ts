import { prisma } from '../db/prisma.js';

export interface StructuredPatientProfile {
  id: string; // Patient User ID or Primary Case ID
  primaryCaseId?: string;
  patientName: string;
  contactNumber: string;
  age: number;
  gender: string;
  city?: string | null;
  occupation?: string | null;
  preferredLang: string;
  totalCases: number;
  latestCase: {
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    chiefComplaints: Array<{ complaint: string; duration?: string; severity?: number; factors?: string }>;
    presentIllness: { description?: string; previousTreatments?: string; responseToTreatment?: string };
    pastMedical: { chronicConditions?: string[]; allergies?: string[]; surgeries?: string };
    lifestyle: { diet?: string; sleep?: string; appetite?: string; stressLevel?: string };
    electropathyDetails: { temperament?: string; previousElectropathy?: string; notes?: string };
  } | null;
  previousCases: Array<{
    id: string;
    createdAt: Date;
    status: string;
    chiefComplaints: any;
    presentIllness: any;
    pastMedical: any;
  }>;
  missingInformation: string[];
  criticalSafetyAlerts: string[];
}

class PatientContextService {
  /**
   * Search patients for admin selection by name, mobile, or ID.
   * Handles ambiguous matches by returning all candidates.
   */
  async searchPatients(query: string, limit = 10) {
    const q = query.trim();
    if (!q) {
      // Return latest cases as default candidates
      const recentCases = await prisma.patientCase.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          patientName: true,
          contactNumber: true,
          age: true,
          gender: true,
          status: true,
          createdAt: true,
          practitioner: {
            select: { id: true, fullName: true, mobileNumber: true }
          }
        }
      });
      return { total: recentCases.length, candidates: recentCases };
    }

    // Match by exact/partial case name, contact number, or case ID
    const matchingCases = await prisma.patientCase.findMany({
      where: {
        OR: [
          { id: { equals: q } },
          { contactNumber: { contains: q } },
          { patientName: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        patientName: true,
        contactNumber: true,
        age: true,
        gender: true,
        status: true,
        createdAt: true,
        practitioner: {
          select: { id: true, fullName: true, mobileNumber: true }
        }
      }
    });

    return {
      total: matchingCases.length,
      candidates: matchingCases,
      isAmbiguous: matchingCases.length > 1
    };
  }

  /**
   * Retrieve complete, up-to-date patient profile and all linked cases directly from PostgreSQL.
   * Can resolve by caseId, userId, or contactNumber.
   */
  async getPatientFullProfile(identifier: {
    caseId?: string;
    userId?: string;
    contactNumber?: string;
    patientName?: string;
  }): Promise<StructuredPatientProfile | null> {
    let targetCase: any = null;
    let allCasesForPatient: any[] = [];
    let linkedUser: any = null;

    if (identifier.caseId) {
      targetCase = await prisma.patientCase.findUnique({
        where: { id: identifier.caseId },
        include: {
          documents: true,
          practitioner: { select: { id: true, fullName: true, mobileNumber: true } }
        }
      });
    }

    if (!targetCase && identifier.userId) {
      // Check if user is linked to patient cases or has cases submitted under them
      linkedUser = await prisma.user.findUnique({
        where: { id: identifier.userId },
        select: { id: true, fullName: true, mobileNumber: true, preferredLang: true, role: true }
      });

      if (linkedUser) {
        // Find cases by user's mobile number or cases where user is practitioner
        targetCase = await prisma.patientCase.findFirst({
          where: {
            OR: [
              { contactNumber: linkedUser.mobileNumber },
              { contactNumber: linkedUser.mobileNumber.replace(/^\+91/, '') },
              { practitionerId: linkedUser.id }
            ]
          },
          orderBy: { createdAt: 'desc' },
          include: { documents: true }
        });
      }
    }

    if (!targetCase && identifier.contactNumber) {
      const cleanContact = identifier.contactNumber.replace(/^\+91/, '').trim();
      targetCase = await prisma.patientCase.findFirst({
        where: {
          OR: [
            { contactNumber: identifier.contactNumber },
            { contactNumber: cleanContact },
            { contactNumber: `+91${cleanContact}` }
          ]
        },
        orderBy: { createdAt: 'desc' },
        include: { documents: true }
      });
    }

    if (!targetCase && identifier.patientName) {
      targetCase = await prisma.patientCase.findFirst({
        where: {
          patientName: { equals: identifier.patientName, mode: 'insensitive' }
        },
        orderBy: { createdAt: 'desc' },
        include: { documents: true }
      });
    }

    if (!targetCase) {
      return null;
    }

    // Now retrieve all cases for this patient to compare current vs previous records
    const contactMatches = [
      targetCase.contactNumber,
      targetCase.contactNumber.replace(/^\+91/, ''),
      `+91${targetCase.contactNumber.replace(/^\+91/, '')}`
    ];

    allCasesForPatient = await prisma.patientCase.findMany({
      where: {
        OR: [
          { contactNumber: { in: contactMatches } },
          { patientName: { equals: targetCase.patientName, mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: { documents: true }
    });

    const latest = allCasesForPatient[0];
    const previous = allCasesForPatient.slice(1);

    // Analyze missing clinical information
    const missingInfo: string[] = [];
    const chiefComplaints: any[] = Array.isArray(latest.chiefComplaints) ? latest.chiefComplaints : [];
    const pastMedical: any = latest.pastMedical || {};
    const presentIllness: any = latest.presentIllness || {};
    const lifestyle: any = latest.lifestyle || {};
    const electropathyDetails: any = latest.electropathyDetails || {};

    if (chiefComplaints.length === 0 || !chiefComplaints[0]?.complaint) {
      missingInfo.push('Chief complaints are not specified');
    } else {
      if (!chiefComplaints[0]?.duration) missingInfo.push('Duration of chief complaint is missing');
      if (chiefComplaints[0]?.severity === undefined || chiefComplaints[0]?.severity === null) {
        missingInfo.push('Severity scale (1-10) is unrecorded');
      }
    }

    if (!pastMedical.allergies || (Array.isArray(pastMedical.allergies) && pastMedical.allergies.length === 0)) {
      missingInfo.push('Allergy history is unverified or marked empty (confirm drug/environmental allergies)');
    }

    if (!pastMedical.chronicConditions || (Array.isArray(pastMedical.chronicConditions) && pastMedical.chronicConditions.length === 0)) {
      missingInfo.push('Chronic co-morbidities (Diabetes, Hypertension, Renal) not explicitly recorded');
    }

    if (!presentIllness.previousTreatments) {
      missingInfo.push('Prior treatments taken (allopathic/ayurvedic/homeopathic) not documented');
    }

    if (!electropathyDetails.temperament) {
      missingInfo.push('Constitutional temperament (Lymphatic/Sanguine/Bilious/Mixed) not determined');
    }

    // Scan for critical safety alerts / emergency red flags in complaints or history
    const criticalAlerts: string[] = [];
    const allText = JSON.stringify({ chiefComplaints, presentIllness, pastMedical }).toLowerCase();
    
    if (allText.includes('chest pain') || allText.includes('heart') || allText.includes('angina')) {
      criticalAlerts.push('URGENT: Cardiac symptoms reported. Exclude acute coronary syndrome immediately.');
    }
    if (allText.includes('shortness of breath') || allText.includes('difficulty breathing') || allText.includes('stridor')) {
      criticalAlerts.push('URGENT: Respiratory distress reported. Check oxygen saturation and respiratory compromise.');
    }
    if (allText.includes('stroke') || allText.includes('paralysis') || allText.includes('facial droop') || allText.includes('slurred speech')) {
      criticalAlerts.push('CRITICAL: Acute neurological deficit / stroke signs reported. Emergency neuro-vascular evaluation required.');
    }
    if (allText.includes('blood in urine') || allText.includes('hematuria') || allText.includes('severe renal colic')) {
      criticalAlerts.push('ATTENTION: Severe urological symptom / renal colic. Rule out obstructive uropathy.');
    }

    return {
      id: latest.id,
      primaryCaseId: latest.id,
      patientName: latest.patientName,
      contactNumber: latest.contactNumber,
      age: latest.age,
      gender: latest.gender,
      city: latest.city,
      occupation: latest.occupation,
      preferredLang: linkedUser?.preferredLang || 'en',
      totalCases: allCasesForPatient.length,
      latestCase: {
        id: latest.id,
        status: latest.status,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt,
        chiefComplaints,
        presentIllness,
        pastMedical,
        lifestyle,
        electropathyDetails
      },
      previousCases: previous.map(p => ({
        id: p.id,
        createdAt: p.createdAt,
        status: p.status,
        chiefComplaints: p.chiefComplaints,
        presentIllness: p.presentIllness,
        pastMedical: p.pastMedical
      })),
      missingInformation: missingInfo,
      criticalSafetyAlerts: criticalAlerts
    };
  }
}

export const patientContextService = new PatientContextService();
