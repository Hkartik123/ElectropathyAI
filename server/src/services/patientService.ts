import { prisma } from '../db/prisma.js';

export interface PatientCase {
  id: string;
  practitionerId: string;
  patientName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  contactNumber: string;
  city: string;
  occupation?: string;
  chiefComplaints: {
    complaint: string;
    duration: string;
    severity: number;
    factors?: string;
  }[];
  presentIllness: {
    description: string;
    previousTreatments?: string;
    responseToTreatment?: string;
  };
  pastMedical: {
    chronicConditions: string[];
    surgeries?: string;
    allergies: string[];
  };
  lifestyle: {
    diet: string;
    sleep: string;
    appetite: string;
    stressLevel: string;
  };
  electropathyDetails?: {
    temperament?: string;
    previousElectropathy?: string;
    notes?: string;
  };
  status: 'draft' | 'submitted' | 'in_review' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

class PatientService {
  async createCase(
    practitionerId: string,
    data: Omit<PatientCase, 'id' | 'practitionerId' | 'createdAt' | 'updatedAt'>
  ): Promise<PatientCase> {
    const created = await prisma.patientCase.create({
      data: {
        practitionerId,
        patientName: data.patientName,
        age: data.age,
        gender: data.gender,
        contactNumber: data.contactNumber,
        city: data.city || null,
        occupation: data.occupation || null,
        chiefComplaints: data.chiefComplaints as any,
        presentIllness: data.presentIllness as any,
        pastMedical: data.pastMedical as any,
        lifestyle: data.lifestyle as any,
        electropathyDetails: data.electropathyDetails as any,
        status: data.status || 'submitted',
      }
    });

    return {
      id: created.id,
      practitionerId: created.practitionerId,
      patientName: created.patientName,
      age: created.age,
      gender: created.gender as any,
      contactNumber: created.contactNumber,
      city: created.city || '',
      occupation: created.occupation || undefined,
      chiefComplaints: (created.chiefComplaints as any) || [],
      presentIllness: (created.presentIllness as any) || { description: '' },
      pastMedical: (created.pastMedical as any) || { chronicConditions: [], allergies: [] },
      lifestyle: (created.lifestyle as any) || { diet: '', sleep: '', appetite: '', stressLevel: '' },
      electropathyDetails: (created.electropathyDetails as any) || undefined,
      status: created.status as any,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  private mapCase(created: any): PatientCase {
    return {
      id: created.id,
      practitionerId: created.practitionerId,
      patientName: created.patientName,
      age: created.age,
      gender: created.gender as any,
      contactNumber: created.contactNumber,
      city: created.city || '',
      occupation: created.occupation || undefined,
      chiefComplaints: (created.chiefComplaints as any) || [],
      presentIllness: (created.presentIllness as any) || { description: '' },
      pastMedical: (created.pastMedical as any) || { chronicConditions: [], allergies: [] },
      lifestyle: (created.lifestyle as any) || { diet: '', sleep: '', appetite: '', stressLevel: '' },
      electropathyDetails: (created.electropathyDetails as any) || undefined,
      status: created.status as any,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }

  async getCasesByPractitioner(practitionerId: string): Promise<PatientCase[]> {
    const list = await prisma.patientCase.findMany({
      where: { practitionerId },
      orderBy: { createdAt: 'desc' }
    });

    return list.map(c => this.mapCase(c));
  }

  /**
   * Patient Isolation: Retrieve ONLY cases linked to this patient's verified mobile number
   */
  async getCasesByPatientContact(mobileNumber: string): Promise<PatientCase[]> {
    if (!mobileNumber) return [];

    // Check multiple formats (E.164, national 10-digit, raw)
    const normDigits = mobileNumber.replace(/\D/g, '');
    const national10 = normDigits.slice(-10);
    const e164 = `+91${national10}`;

    const searchValues = Array.from(new Set([mobileNumber, national10, e164, normDigits]));

    const list = await prisma.patientCase.findMany({
      where: {
        contactNumber: { in: searchValues }
      },
      orderBy: { createdAt: 'desc' }
    });

    return list.map(c => this.mapCase(c));
  }

  /**
   * Admin: List all clinical cases
   */
  async getAllCases(): Promise<PatientCase[]> {
    const list = await prisma.patientCase.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return list.map(c => this.mapCase(c));
  }

  async getCaseById(id: string): Promise<PatientCase | null> {
    const created = await prisma.patientCase.findUnique({
      where: { id }
    });
    if (!created) return null;

    return this.mapCase(created);
  }

  async updateCase(
    id: string,
    data: Partial<Omit<PatientCase, 'id' | 'practitionerId' | 'createdAt' | 'updatedAt'>>
  ): Promise<PatientCase> {
    const updateData: any = {};
    if (data.patientName !== undefined) updateData.patientName = data.patientName;
    if (data.age !== undefined) updateData.age = Number(data.age);
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.contactNumber !== undefined) updateData.contactNumber = data.contactNumber;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.occupation !== undefined) updateData.occupation = data.occupation;
    if (data.chiefComplaints !== undefined) updateData.chiefComplaints = data.chiefComplaints as any;
    if (data.presentIllness !== undefined) updateData.presentIllness = data.presentIllness as any;
    if (data.pastMedical !== undefined) updateData.pastMedical = data.pastMedical as any;
    if (data.lifestyle !== undefined) updateData.lifestyle = data.lifestyle as any;
    if (data.electropathyDetails !== undefined) updateData.electropathyDetails = data.electropathyDetails as any;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.patientCase.update({
      where: { id },
      data: updateData
    });

    return this.mapCase(updated);
  }
}

export const patientService = new PatientService();
