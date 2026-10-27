import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { patientService, PatientCase } from '../services/patientService.js';
import { auditService } from '../services/auditService.js';
import { normalizePhoneNumber } from '../utils/phone.js';

export class PatientController {
  async createCase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const {
        patientName,
        age,
        gender,
        contactNumber,
        city,
        occupation,
        chiefComplaints,
        presentIllness,
        pastMedical,
        lifestyle,
        electropathyDetails,
        status
      } = req.body;

      if (!patientName || !age || !gender) {
        res.status(400).json({
          success: false,
          message: 'Patient name, age, and gender are required.'
        });
        return;
      }

      // Enforce verified contact number for patient role
      let finalContact = contactNumber;
      if (user.role === 'patient') {
        finalContact = user.mobileNumber;
      } else if (!finalContact) {
        finalContact = user.mobileNumber;
      }

      const norm = normalizePhoneNumber(finalContact);
      const normalizedContact = norm.isValid ? norm.e164 : finalContact;

      const newCase = await patientService.createCase(user.id, {
        patientName,
        age: Number(age),
        gender,
        contactNumber: normalizedContact,
        city: city || '',
        occupation: occupation || '',
        chiefComplaints: chiefComplaints || [],
        presentIllness: presentIllness || { description: '' },
        pastMedical: pastMedical || { chronicConditions: [], allergies: [] },
        lifestyle: lifestyle || { diet: '', sleep: '', appetite: '', stressLevel: '' },
        electropathyDetails: electropathyDetails || {},
        status: status || 'submitted'
      });

      // Record activity
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      await auditService.log(
        user.id,
        'PATIENT_CASE_CREATED',
        newCase.id,
        { patientName, age, gender, city, role: user.role },
        ip
      );

      res.status(201).json({
        success: true,
        message: 'Patient case history recorded successfully.',
        case: newCase
      });
    } catch (error: any) {
      console.error('[PATIENT CONTROLLER createCase ERROR]', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to save patient case history.'
      });
    }
  }

  async getCases(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      let cases: PatientCase[] = [];

      if (user.role === 'practitioner') {
        // Practitioners see cases they created
        cases = await patientService.getCasesByPractitioner(user.id);
      } else if (user.role === 'admin') {
        // Admins can see all cases
        cases = await patientService.getAllCases();
      } else {
        // Patients ONLY see cases that match their verified mobile number
        cases = await patientService.getCasesByPatientContact(user.mobileNumber);
      }

      res.status(200).json({
        success: true,
        count: cases.length,
        cases
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve patient cases.'
      });
    }
  }

  async getCaseById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const patientCase = await patientService.getCaseById(id);

      if (!patientCase) {
        res.status(404).json({ success: false, message: 'Patient case not found.' });
        return;
      }

      // Strict Ownership Check:
      // Must be the practitioner who created it, the patient it belongs to, or an admin
      const isOwnerPractitioner = patientCase.practitionerId === user.id;
      
      const normUser = normalizePhoneNumber(user.mobileNumber);
      const normCase = normalizePhoneNumber(patientCase.contactNumber);
      const isOwnerPatient = 
        patientCase.contactNumber === user.mobileNumber ||
        (normUser.isValid && normCase.isValid && normUser.national10Digit === normCase.national10Digit);

      const isAdmin = user.role === 'admin';

      if (!isOwnerPractitioner && !isOwnerPatient && !isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You do not have permission to view this medical case record.'
        });
        return;
      }

      res.status(200).json({
        success: true,
        case: patientCase
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateCase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const id = req.params.id as string;
      const existing = await patientService.getCaseById(id);
      if (!existing) {
        res.status(404).json({ success: false, message: 'Patient case not found.' });
        return;
      }

      // Check ownership or admin
      const isOwnerPractitioner = existing.practitionerId === user.id;
      const normUser = normalizePhoneNumber(user.mobileNumber);
      const normCase = normalizePhoneNumber(existing.contactNumber);
      const isOwnerPatient =
        existing.contactNumber === user.mobileNumber ||
        (normUser.isValid && normCase.isValid && normUser.national10Digit === normCase.national10Digit);
      const isAdmin = user.role === 'admin';

      if (!isOwnerPractitioner && !isOwnerPatient && !isAdmin) {
        res.status(403).json({ success: false, message: 'Access denied.' });
        return;
      }

      const updated = await patientService.updateCase(id, req.body);

      // Audit log
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      await auditService.log(
        user.id,
        'PATIENT_CASE_UPDATED',
        id,
        { patientName: updated.patientName },
        ip
      );

      res.status(200).json({
        success: true,
        message: 'Patient case updated successfully.',
        case: updated
      });
    } catch (error: any) {
      console.error('[PATIENT CONTROLLER updateCase ERROR]', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update case.' });
    }
  }
}

export const patientController = new PatientController();
