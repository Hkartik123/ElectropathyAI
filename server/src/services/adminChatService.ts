import { geminiService } from './geminiService.js';
import { patientContextService, StructuredPatientProfile } from './patientContextService.js';
import { knowledgeService, RetrievedKnowledgeChunk } from './knowledgeService.js';
import { auditService } from './auditService.js';

export interface AdminChatRequest {
  adminId: string;
  query: string;
  patientId?: string; // Optional caseId or userId
  ipAddress?: string;
}

export interface AdminChatResponse {
  answer: string;
  patientProfile?: StructuredPatientProfile | null;
  doctorDatasetMatches: Array<{
    id: string;
    category: string;
    conditionOrTitle?: string;
    citation?: string;
    content: string;
    relevanceScore?: number;
  }>;
  missingInformation: string[];
  criticalSafetyAlerts: string[];
  geminiInterpretation?: string;
  precautions?: string[];
  model: string;
  latencyMs: number;
}

class AdminChatService {
  async processAdminQuery(req: AdminChatRequest): Promise<AdminChatResponse> {
    const cleanQuery = geminiService.sanitizeInput(req.query);
    if (!cleanQuery) {
      throw new Error('Query text is required');
    }

    // 1. Resolve Patient Context if patientId provided or mentioned
    let patientProfile: StructuredPatientProfile | null = null;
    let queryPatientId = req.patientId;

    if (queryPatientId) {
      patientProfile = await patientContextService.getPatientFullProfile({ caseId: queryPatientId });
      if (!patientProfile) {
        patientProfile = await patientContextService.getPatientFullProfile({ userId: queryPatientId });
      }
    } else {
      // Check if query contains a 10-digit mobile number or known patient name
      const phoneMatch = cleanQuery.match(/\b(?:\+91)?[6-9]\d{9}\b/);
      if (phoneMatch) {
        patientProfile = await patientContextService.getPatientFullProfile({ contactNumber: phoneMatch[0] });
      }
    }

    // 2. Retrieve Doctor-Approved Electropathy Knowledge Chunks
    let knowledgeQuery = cleanQuery;
    if (patientProfile?.latestCase?.chiefComplaints?.[0]?.complaint) {
      knowledgeQuery += ` ${patientProfile.latestCase.chiefComplaints[0].complaint}`;
    }
    const datasetMatches = await knowledgeService.findMatchingKnowledge(knowledgeQuery, { limit: 4 });

    // 3. Assemble Grounded Context for Gemini
    let patientContextText = 'NO SPECIFIC PATIENT SELECTED.';
    if (patientProfile) {
      const lc = patientProfile.latestCase;
      const complaintsStr = lc?.chiefComplaints?.map(c => 
        `- Complaint: ${c.complaint} | Duration: ${c.duration || 'Not specified'} | Severity: ${c.severity !== undefined ? c.severity + '/10' : 'Unrecorded'} | Aggravating/Relieving: ${c.factors || 'None'}`
      ).join('\n') || 'None recorded';

      const prevCasesStr = patientProfile.previousCases.map(pc =>
        `- Date: ${pc.createdAt.toISOString().split('T')[0]} | Status: ${pc.status} | Complaints: ${JSON.stringify(pc.chiefComplaints)}`
      ).join('\n') || 'No previous cases';

      patientContextText = `VERIFIED PATIENT DATABASE RECORD (Source: PostgreSQL live):
• Patient Name: ${patientProfile.patientName}
• Case ID: ${patientProfile.id}
• Age: ${patientProfile.age} | Gender: ${patientProfile.gender} | Contact: ${patientProfile.contactNumber}
• Status: ${lc?.status || 'Unknown'} | Total Submitted Cases: ${patientProfile.totalCases}
• Chief Complaints:
${complaintsStr}
• Present Illness & Previous Treatments:
  - Description: ${lc?.presentIllness?.description || 'None recorded'}
  - Previous Treatments: ${lc?.presentIllness?.previousTreatments || 'None recorded'}
  - Response to Treatments: ${lc?.presentIllness?.responseToTreatment || 'Not documented'}
• Past Medical History & Allergies:
  - Known Allergies: ${lc?.pastMedical?.allergies?.length ? lc.pastMedical.allergies.join(', ') : 'None Reported / Empty'}
  - Chronic Conditions: ${lc?.pastMedical?.chronicConditions?.length ? lc.pastMedical.chronicConditions.join(', ') : 'None Reported'}
  - Past Surgeries: ${lc?.pastMedical?.surgeries || 'None'}
• Lifestyle & Personal History:
  - Diet: ${lc?.lifestyle?.diet || 'Not recorded'} | Sleep: ${lc?.lifestyle?.sleep || 'Not recorded'} | Stress: ${lc?.lifestyle?.stressLevel || 'Not recorded'}
• Electropathy Details:
  - Temperament: ${lc?.electropathyDetails?.temperament || 'Not assessed'}
  - Notes: ${lc?.electropathyDetails?.notes || 'None'}
• Previous Case Records Comparison:
${prevCasesStr}
• Detected Missing Clinical Information:
${patientProfile.missingInformation.length ? patientProfile.missingInformation.map(m => `⚠️ ${m}`).join('\n') : 'All baseline clinical fields present'}
• Critical Safety Flags:
${patientProfile.criticalSafetyAlerts.length ? patientProfile.criticalSafetyAlerts.map(a => `🚨 ${a}`).join('\n') : 'No acute emergency flags detected'}`;
    }

    let doctorDatasetText = 'NO MATCHING DOCTOR-APPROVED DATASET RECORD FOUND.';
    if (datasetMatches.length > 0) {
      doctorDatasetText = datasetMatches.map((m, idx) => 
        `[DOCTOR DATASET MATCH #${idx + 1}] (Reference: ${m.citation || m.id})\n${m.content}`
      ).join('\n\n---\n\n');
    }

    // 4. Gemini Prompt & System Instruction
    const systemInstruction = `You are the Electropathy AI Clinical & Administrative Decision Support Assistant built for Dr. Ashish Wandhare.
You are assisting authorized clinical administrators and practitioners.

STRICT GROUNDING & MEDICAL SAFETY RULES:
1. BASE YOUR CLINICAL REPORT STRICTLY on the supplied VERIFIED PATIENT DATABASE RECORD and DOCTOR-APPROVED DATASET.
2. NEVER FABRICATE, invent, or hallucinate patient details, test results, medicines, or dosages.
3. CLEARLY DISTINGUISH THREE DISTINCT SECTIONS in your response:
   - "### 📋 Patient Clinical Record Summary" (Pure database facts: complaints, history, allergies, previous treatments)
   - "### 🌿 Doctor-Approved Electropathy Dataset Findings" (Verified remedies from Dr. Wandhare's dataset with citations)
   - "### 💡 Clinical Interpretation & Practitioner Review Notes" (AI differential reasoning, precautions, and missing data alerts)
4. IF NO MATCHING DOCTOR-APPROVED RECORD EXISTS in the provided dataset, you MUST EXPLICITLY STATE:
   "No matching record was found in the doctor-approved dataset for this specific presentation." You may explain general medical principles, but NEVER portray them as verified doctor-approved remedies.
5. IF THE PATIENT HAS REPORTED ALLERGIES OR RED FLAGS, prominently highlight them under Precautions.
6. Provide a concise, highly structured, professional Markdown output suitable for medical review.`;

    const fullPrompt = `${patientContextText}

============================================================
DOCTOR-APPROVED MEDICINE DATASET EVIDENCE:
============================================================
${doctorDatasetText}

============================================================
ADMINISTRATOR / PRACTITIONER QUERY:
============================================================
"${cleanQuery}"

Provide a comprehensive, structured response answering the query with complete accuracy.`;

    // 5. Generate AI Response
    let aiResponse;
    try {
      aiResponse = await geminiService.generateText(fullPrompt, systemInstruction, {
        temperature: 0.15,
        maxOutputTokens: 2500
      });
    } catch (err: any) {
      console.warn('[ADMIN CHAT] Falling back to structured local clinical synthesis due to Gemini error:', err.message);
      // Graceful fallback response when external AI is offline or quota exceeded
      aiResponse = {
        text: `### 📋 Patient Clinical Record Summary\n\n${patientContextText}\n\n### 🌿 Doctor-Approved Electropathy Dataset Findings\n\n${doctorDatasetText}\n\n> ⚠️ *Note: Gemini AI generation is temporarily delayed or offline (${err.message}). The authoritative database records and verified doctor dataset matches above were retrieved directly from PostgreSQL.*`,
        model: 'database-fallback-engine',
        latencyMs: 15
      };
    }

    // 6. Record Audit Log for Administrative Access
    try {
      await auditService.log(
        req.adminId,
        'ADMIN_AI_QUERY',
        patientProfile?.id || undefined,
        {
          patientName: patientProfile?.patientName || 'None',
          contactNumber: patientProfile?.contactNumber || 'None',
          datasetMatchesCount: datasetMatches.length,
          queryLength: cleanQuery.length
        },
        req.ipAddress
      );
    } catch (auditErr) {
      console.warn('[ADMIN CHAT] Audit logging warning:', auditErr);
    }

    return {
      answer: aiResponse.text,
      patientProfile,
      doctorDatasetMatches: datasetMatches.map(m => ({
        id: m.id,
        category: m.category,
        conditionOrTitle: (m.metadata as any)?.conditionOrTitle,
        citation: m.citation,
        content: m.content,
        relevanceScore: m.relevanceScore
      })),
      missingInformation: patientProfile?.missingInformation || [],
      criticalSafetyAlerts: patientProfile?.criticalSafetyAlerts || [],
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs
    };
  }
}

export const adminChatService = new AdminChatService();
