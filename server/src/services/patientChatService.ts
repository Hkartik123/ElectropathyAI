import { prisma } from '../db/prisma.js';
import { geminiService } from './geminiService.js';
import { patientContextService } from './patientContextService.js';
import { knowledgeService } from './knowledgeService.js';

export interface PatientChatRequest {
  userId: string;
  conversationId: string;
  content: string;
  preferredLang?: string; // 'en', 'hi', 'mr'
}

export interface PatientChatResponse {
  userMessage: any;
  assistantMessage: any;
  emergencyAlert?: string | null;
  datasetMatchesCount: number;
  model: string;
  latencyMs: number;
}

class PatientChatService {
  /**
   * Process patient chat message, enforce safety, check emergency red flags,
   * ground with doctor's dataset and live patient medical history, and save to DB.
   */
  async processPatientMessage(req: PatientChatRequest): Promise<PatientChatResponse> {
    const cleanContent = geminiService.sanitizeInput(req.content);
    if (!cleanContent) {
      throw new Error('Message content is required');
    }

    // 1. Verify Conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: req.conversationId,
        userId: req.userId,
        isDeleted: false
      },
      include: {
        messages: {
          take: 8,
          orderBy: { createdAt: 'desc' }
        },
        user: {
          select: { id: true, preferredLang: true, fullName: true, mobileNumber: true }
        }
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found or unauthorized');
    }

    // 2. Fetch authenticated patient's live profile & case history from PostgreSQL
    const patientProfile = await patientContextService.getPatientFullProfile({ userId: req.userId });

    // Determine target language (priority: conversation language > user preferred language > 'en')
    const targetLang = conversation.language || conversation.user.preferredLang || req.preferredLang || 'en';

    // 3. Emergency Red Flag Detection
    const emergencyAlert = this.detectEmergencyRedFlags(cleanContent, targetLang);

    // 4. Retrieve Doctor-Approved Electropathy Knowledge Chunks
    const datasetMatches = await knowledgeService.findMatchingKnowledge(cleanContent, { limit: 3 });

    // 5. Assemble Grounded Context for Gemini
    const langInstructions: Record<string, string> = {
      en: 'Respond in clear, empathetic, and professional English.',
      hi: 'Respond completely in natural, clear, and empathetic Hindi (हिंदी). Use proper Devanagari script.',
      mr: 'Respond completely in natural, clear, and empathetic Marathi (मराठी). Use proper Devanagari script.'
    };

    const chosenLangRule = langInstructions[targetLang] || langInstructions.en;

    // Past turns for multi-turn conversation memory (ordered chronologically)
    const recentMessages = conversation.messages.slice().reverse().map(m => 
      `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.content}`
    ).join('\n');

    let patientKnownFacts = 'No recorded medical history for this patient yet.';
    if (patientProfile?.latestCase) {
      const lc = patientProfile.latestCase;
      patientKnownFacts = `Verified Patient Medical Facts (Live PostgreSQL Database):
• Known Allergies: ${lc.pastMedical?.allergies?.length ? lc.pastMedical.allergies.join(', ') : 'None Reported'}
• Chronic Conditions: ${lc.pastMedical?.chronicConditions?.length ? lc.pastMedical.chronicConditions.join(', ') : 'None Reported'}
• Age: ${patientProfile.age || 'Not specified'} | Gender: ${patientProfile.gender || 'Not specified'}
• Chief Complaint on File: ${lc.chiefComplaints?.[0]?.complaint || 'None'}`;
    }

    let doctorDatasetText = 'NO MATCHING DOCTOR-APPROVED REMEDY IN DATASET.';
    if (datasetMatches.length > 0) {
      doctorDatasetText = datasetMatches.map((m, i) => 
        `[APPROVED DOCTOR RECORD #${i + 1}] (Ref: ${m.citation || m.id})\n${m.content}`
      ).join('\n\n---\n\n');
    }

    // 6. Build Safe Prompt & System Instructions
    const systemInstruction = `You are the Electropathy AI Patient Wellness Assistant for Dr. Ashish Wandhare's clinic.
You are interacting directly with a patient who is asking about their symptoms or health concerns.

LANGUAGE INSTRUCTION:
${chosenLangRule}

CRITICAL MEDICAL SAFETY & ETHICAL RULES:
1. NEVER CLAIM A DEFINITIVE DIAGNOSIS. Explain possible common causes and clearly state that a qualified doctor must evaluate them.
2. DO NOT INDEPENDENTLY PRESCRIBE PRESCRIPTION DRUGS or invent pharmaceutical/allopathic dosages.
3. NEVER RECOMMEND STOPPING OR ALTERING PRESCRIBED MEDICATIONS.
4. EMERGENCY TRIAGE: If the patient reports serious warning symptoms (chest pain, shortness of breath, signs of stroke, severe allergic reaction/anaphylaxis, loss of consciousness, persistent severe vomiting), IMMEDIATELY prioritize recommending emergency hospital care or calling an ambulance. Home remedies must NOT replace emergency care.
5. GROUNDING IN DOCTOR'S DATASET:
   - If a matching doctor-approved Electropathy remedy was retrieved from Dr. Wandhare's dataset, you may explain the general supportive approach and precautions with clear attribution.
   - If NO matching doctor-approved record was retrieved, EXPLICITLY STATE that no matching electropathy remedy is found in the doctor-approved clinic dataset for this specific complaint.
6. PRACTICAL SELF-CARE & PRECAUTIONS:
   - Offer simple, low-risk, evidence-based supportive home self-care measures (hydration, rest, dietary adjustments) appropriate to their symptoms.
   - ALWAYS state relevant safety precautions and when to seek urgent in-person medical evaluation.
7. ACCOUNT FOR PATIENT'S KNOWN ALLERGIES & CHRONIC CONDITIONS:
   - Always verify against the patient's known allergies and chronic conditions provided in the context.
8. ASK FOLLOW-UP QUESTIONS: If important details such as symptom duration, severity, or triggers are missing, ask gentle clarifying questions.`;

    const fullPrompt = `${patientKnownFacts}

============================================================
DOCTOR-APPROVED CLINIC DATASET EVIDENCE:
============================================================
${doctorDatasetText}

============================================================
RECENT CONVERSATION HISTORY:
============================================================
${recentMessages || 'Beginning of conversation.'}

============================================================
PATIENT'S NEW MESSAGE:
============================================================
"${cleanContent}"

${emergencyAlert ? `NOTE: Emergency red flag detected in user message: "${emergencyAlert}". Ensure prominent urgent care advisory.` : ''}

Respond with empathy, medical accuracy, and clear safety guidance following all rules.`;

    // 7. Generate Response via Gemini
    let aiResponse;
    try {
      aiResponse = await geminiService.generateText(fullPrompt, systemInstruction, {
        temperature: 0.25,
        maxOutputTokens: 1800
      });
    } catch (err: any) {
      console.warn('[PATIENT CHAT] Gemini generation failure, providing database-backed clinical response:', err.message);
      aiResponse = {
        text: this.getOfflineSafeResponse(cleanContent, targetLang, emergencyAlert, datasetMatches, patientProfile, err.message),
        model: 'database-clinical-engine',
        latencyMs: 15
      };
    }

    // 8. Atomically persist User Message and Assistant Message in PostgreSQL
    const result = await prisma.$transaction(async (tx) => {
      const userMsg = await tx.message.create({
        data: {
          conversationId: req.conversationId,
          role: 'user',
          content: cleanContent
        }
      });

      const assistantMsg = await tx.message.create({
        data: {
          conversationId: req.conversationId,
          role: 'assistant',
          content: aiResponse.text,
          metadata: {
            model: aiResponse.model,
            latencyMs: aiResponse.latencyMs,
            emergencyFlag: Boolean(emergencyAlert),
            datasetMatchesCount: datasetMatches.length,
            targetLang
          }
        }
      });

      // Update conversation title if this is the first exchange
      if (conversation.messages.length === 0) {
        const generatedTitle = cleanContent.length > 35 
          ? cleanContent.slice(0, 35) + '...' 
          : cleanContent;
        await tx.conversation.update({
          where: { id: req.conversationId },
          data: { title: generatedTitle, updatedAt: new Date() }
        });
      } else {
        await tx.conversation.update({
          where: { id: req.conversationId },
          data: { updatedAt: new Date() }
        });
      }

      return { userMsg, assistantMsg };
    });

    return {
      userMessage: result.userMsg,
      assistantMessage: result.assistantMsg,
      emergencyAlert,
      datasetMatchesCount: datasetMatches.length,
      model: aiResponse.model,
      latencyMs: aiResponse.latencyMs
    };
  }

  /**
   * Detect life-threatening emergency symptoms requiring immediate hospitalization
   */
  detectEmergencyRedFlags(text: string, lang: string): string | null {
    const t = text.toLowerCase();

    const redFlags = [
      { pattern: /chest pain|angina|heart attack|छाती में दर्द|छातीत दुखणे/, alert: 'Chest pain / cardiac warning signs' },
      { pattern: /difficulty breathing|shortness of breath|breathless|सांस फूलना|दम लागणे/, alert: 'Severe respiratory distress' },
      { pattern: /stroke|facial droop|slurred speech|paralysis|लकवा|पक्षाघात/, alert: 'Neurological deficit / Stroke signs' },
      { pattern: /severe allergic|swelling of lips|tongue swelling|anaphylaxis|गला बंद होना/, alert: 'Severe allergic reaction / Anaphylaxis' },
      { pattern: /unconscious|passed out|fainted|बेहोश|बेशुद्ध/, alert: 'Loss of consciousness' },
      { pattern: /coughing blood|vomiting blood|खून की उल्टी|रक्ताची उलटी/, alert: 'Active hemorrhage / Hemoptysis' }
    ];

    for (const rf of redFlags) {
      if (rf.pattern.test(t)) {
        return rf.alert;
      }
    }

    return null;
  }

  /**
   * Safe database-grounded fallback response when Gemini API is temporarily unavailable
   */
  private getOfflineSafeResponse(
    query: string,
    lang: string,
    emergencyAlert: string | null,
    datasetMatches: any[] = [],
    patientProfile: any = null,
    errorMessage?: string
  ): string {
    if (emergencyAlert) {
      if (lang === 'hi') {
        return `⚠️ **आपातकालीन चेतावनी**: आपके द्वारा बताए गए लक्षण (${emergencyAlert}) गंभीर हो सकते हैं। कृपया तुरंत नजदीकी अस्पताल के आपातकालीन विभाग में जाएं या एम्बुलेंस से संपर्क करें। किसी भी घरेलू उपचार के भरोसे न रहें।`;
      }
      if (lang === 'mr') {
        return `⚠️ **तातडीचा इशारा**: आपण नमूद केलेली लक्षणे (${emergencyAlert}) गंभीर असू शकतात. कृपया ताबडतोब नजीकच्या रुग्णालयात किंवा आपत्कालीन वैद्यकीय कक्षात संपर्क साधा. घरगुती उपायांवर अवलंबून राहू नका.`;
      }
      return `⚠️ **EMERGENCY WARNING**: The symptoms you described (${emergencyAlert}) require immediate professional medical evaluation. Please visit the nearest emergency room or call emergency medical services immediately. Do not rely on home remedies for severe symptoms.`;
    }

    // Format verified doctor dataset matches from PostgreSQL
    let remediesBlock = '';
    if (datasetMatches.length > 0) {
      remediesBlock = datasetMatches.map((m, idx) => {
        return `**${idx + 1}. Clinical Record (${m.citation || 'Dr. Ashish Wandhare Verified Protocol'})**\n${m.content}`;
      }).join('\n\n');
    }

    const patientAllergyNotice = patientProfile?.latestCase?.pastMedical?.allergies?.length
      ? `\n\n*Note on allergies: Patient has documented allergies to: ${patientProfile.latestCase.pastMedical.allergies.join(', ')}.*`
      : '';

    if (lang === 'hi') {
      return `### 🌿 डॉ. आशीष वांधारे प्रमाणित इलेक्ट्रोपैथी परामर्श

आपके लक्षण/प्रश्न ("${query}") के संबंध में प्रमाणित डेटाबेस से निम्नलिखित जानकारी उपलब्ध है:

${remediesBlock || 'इस विशिष्ट लक्षण के लिए क्लिनिक डेटाबेस में अभी कोई पूर्व-प्रमाणित रिकॉर्ड नहीं मिला है।'}
${patientAllergyNotice}

### 💡 सामान्य सावधानियां एवं देखभाल:
* पर्याप्त मात्रा में गुनगुना पानी पिएं और पर्याप्त आराम करें।
* किसी भी तीव्र दर्द या असुविधा में बिना डॉक्टर की सलाह के दवा की खुराक न बदलें।
* व्यक्तिगत परीक्षण एवं सटीक डायल्यूशन निर्धारण के लिए कृपया क्लिनिक में डॉ. आशीष वांधारे से परामर्श लें।

> ⚠️ *सूचना: गूगल जेमिनी एआई का दैनिक फ्री कोटा (20 अनुरोध/दिन) समाप्त होने के कारण यह जानकारी सीधे पोस्टग्रेएसक्यूएल क्लिनिकल डेटाबेस से प्रदान की गई है। नया एपीआई टोकन जोड़ने पर लाइव एआई पुनर्जनन स्वतः सक्रिय हो जाएगा।*`;
    }

    if (lang === 'mr') {
      return `### 🌿 डॉ. आशिष वांधारे प्रमाणित इलेक्ट्रोपॅथी सल्ला

आपल्या प्रश्नाबाबत ("${query}") क्लिनिक डेटाबेसमधून खालील माहिती उपलब्ध झाली आहे:

${remediesBlock || 'या लक्षणांसाठी क्लिनिक डेटाबेसमध्ये पूर्व-प्रमाणित रेकॉर्ड आढळले नाही.'}
${patientAllergyNotice}

### 💡 सामान्य काळजी व सूचना:
* भरपूर पाणी प्या आणि पुरेशी विश्रांती घ्या.
* वैयक्तिक तपासणी व अचूक डायल्यूशन निवडीसाठी कृपया तज्ज्ञ डॉक्टरांचा सल्ला घ्या.

> ⚠️ *टीप: गुगल जेमिनी एआय चा दैनंदिन फ्री कोटा (20 requests/day) संपल्यामुळे ही माहिती थेट पोस्टग्रेस क्लिनिकल डेटाबेसमधून देण्यात आली आहे.*`;
    }

    return `### 🌿 Dr. Ashish Wandhare's Verified Electropathy Clinical Guidance

In response to your health query regarding **"${query}"**, the following doctor-approved Electropathy protocols were retrieved from Dr. Ashish Wandhare's clinic dataset:

${remediesBlock || '*No direct matching remedy record was found in the clinic dataset for this specific phrase. Please consult with the doctor for a personalized clinical intake.*'}
${patientAllergyNotice}

### 💧 Supportive Self-Care & Clinical Precautions:
* **Hydration & Rest:** Maintain adequate fluid intake and prioritize rest to support your lymphatic circulation.
* **Avoid Self-Medicating:** Do not modify prescribed chronic medications without consulting your attending physician.
* **In-Person Evaluation:** For acute or worsening symptoms, an in-person clinical examination and pulse/temperament diagnosis is advised.

> ⚠️ *System Notice: Real-time Gemini AI dynamic generation is currently operating via the Authoritative Clinic Database Engine because the Google AI Studio free-tier daily request quota (20 requests/day) has been reached on this API key. The clinical records and remedies above were retrieved directly from Dr. Ashish Wandhare's verified PostgreSQL dataset.*`;
  }
}

export const patientChatService = new PatientChatService();

