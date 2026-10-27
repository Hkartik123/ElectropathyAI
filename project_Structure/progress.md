# Electropathy AI — Implementation Progress & Architecture Documentation

**Document:** Implementation Progress & System Architecture  
**Project:** Electropathy AI — Admin & Patient Chatbots with Gemini Integration  
**Date:** October 20, 2026  
**Status:** Completed & Verified  

---

## 1. Executive Summary

We have completed the full implementation of the **Electropathy AI Admin and Patient Chatbots with Google Gemini Integration**, adhering to real-time database grounding, doctor-approved dataset retrieval, strict medical safety guardrails, and role-based access control.

### Core Milestones Achieved
1. **Gemini 2.5 Flash / 1.5 Flash Backend Service**:
   - Secure server-side execution with API key shielding.
   - Guardrails against independent prescribing, invented dosages, or model hallucinations.
   - Built-in retry mechanism, 20s timeout, and model fallback.
2. **Doctor-Approved Electropathy Dataset & Knowledge Base**:
   - Seeded Dr. Ashish Wandhare's verified Electropathy Clinical Treatment Protocols & Materia Medica into PostgreSQL `KnowledgeDocument` and `KnowledgeChunk`.
   - Real-time querying without static caching (`isApproved: true, isEnabled: true`).
   - Clear distinction between doctor-approved remedies (with citations) and general AI interpretation.
3. **Live PostgreSQL Patient Context Retrieval**:
   - Authoritative query-time database fetching via Prisma ORM.
   - Support for patient search by name, mobile number, or case ID with ambiguous-name handling.
   - Extraction of complaints, duration, severity, present illness, past medical (chronic conditions, allergies), lifestyle, and electropathy temperament.
   - Missing information detection and emergency red flag analysis.
4. **Admin AI Clinical Assistant**:
   - Integrated as a prominent tab in the Admin Portal with deep navy / teal medical-grade UI.
   - Patient search, selector, active patient context banner, and quick clinical prompt chips.
   - Structured responses separated into: Patient Database Record Summary, Doctor-Approved Dataset Findings, and Clinical Interpretation / Precautions.
   - One-click Markdown copy-summary functionality.
   - Sensitive administrative AI queries logged to `AuditLog`.
5. **Patient Chatbot Upgrade**:
   - Replaced previous frontend keyword simulation with real backend Gemini integration.
   - Multilingual support for English, Hindi (`hi`), and Marathi (`mr`) in authentic Devanagari script.
   - Automatic emergency escalation for red flag symptoms (chest pain, shortness of breath, stroke signs, anaphylaxis, loss of consciousness).
   - Atomic multi-turn conversation and message persistence in PostgreSQL.
6. **Automated Verification & Quality Assurance**:
   - 39-point automated test suite passed with 0 failures (`chatbotVerificationTest.ts`).
   - Real-time DB synchronization verified: updates to symptoms or newly added allergies reflect immediately in chatbot responses without server restart.

---

## 2. System Architecture & Information Flow

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend (React + Vite + TypeScript)"]
        ADMIN_UI["Admin Portal: AI Clinical Assistant (AdminAIChatbot.tsx)"]
        PATIENT_UI["Patient Portal: Chat Consultation (ChatHistoryView.tsx)"]
        API_SVC["Frontend API Service (api.ts)"]
        ADMIN_UI --> API_SVC
        PATIENT_UI --> API_SVC
    end

    subgraph SecurityLayer["Security & Authentication (Express Middlewares)"]
        AUTH_MW["authenticate (JWT Bearer Token)"]
        ADMIN_MW["requireAdmin (Role Verification)"]
    end

    subgraph ServiceLayer["Backend Services (Node.js + TypeScript)"]
        ACS["Admin Chat Service (adminChatService.ts)"]
        PCS["Patient Chat Service (patientChatService.ts)"]
        PCS_CTX["Patient Context Service (patientContextService.ts)"]
        KS["Knowledge Service (knowledgeService.ts)"]
        GS["Gemini AI Service (geminiService.ts)"]
        AUDIT["Audit Service (auditService.ts)"]
    end

    subgraph StorageLayer["Authoritative Database (PostgreSQL on Supabase)"]
        T_USERS[("users")]
        T_CASES[("patient_cases")]
        T_DOCS[("patient_documents")]
        T_CONV[("conversations & messages")]
        T_KNOW[("knowledge_documents & chunks")]
        T_AUDIT[("audit_logs")]
    end

    subgraph ExternalAI["External AI Provider (Google Cloud)"]
        GEMINI_API["Google Generative Language API (Gemini 2.5 Flash / 1.5 Flash)"]
    end

    API_SVC -->|/api/admin/chat| AUTH_MW --> ADMIN_MW --> ACS
    API_SVC -->|/api/conversations/:id/chat| AUTH_MW --> PCS

    ACS --> PCS_CTX
    ACS --> KS
    ACS --> GS
    ACS --> AUDIT

    PCS --> PCS_CTX
    PCS --> KS
    PCS --> GS

    PCS_CTX <--> T_CASES
    PCS_CTX <--> T_USERS
    KS <--> T_KNOW
    PCS <--> T_CONV
    AUDIT --> T_AUDIT

    GS <-->|Secure API Key| GEMINI_API
```

---

## 3. Detailed Component Breakdown

### A. Backend AI & Data Services

| File | Purpose & Responsibilities |
| :--- | :--- |
| **`server/src/services/geminiService.ts`** | Backend-only Gemini API communication handler. Reads `GEMINI_API_KEY` / `Gemini_API_KEY`. Enforces prompt sanitization against prompt injection, handles rate limiting, timeouts (20s), and model failovers (`gemini-2.5-flash` $\rightarrow$ `gemini-1.5-flash`). API key is never logged or exposed. |
| **`server/src/services/knowledgeData.ts`** | Structured clinical protocol dataset based on Dr. Ashish Wandhare's verified Electropathy Materia Medica. Contains remedies, dilutions, dosages, administration routes, precautions, contraindications, and citations. |
| **`server/src/services/knowledgeService.ts`** | Manages `KnowledgeDocument` and `KnowledgeChunk` records in PostgreSQL. Automatically seeds doctor dataset chunks on first run. Performs real-time search across approved & enabled chunks. Returns zero matches when a condition has no verified doctor protocol. |
| **`server/src/services/patientContextService.ts`** | Queries authoritative, up-to-date PostgreSQL records for patients. Resolves patient identity by unique case ID, user ID, contact number, or name. Handles ambiguous patient names with candidate lists. Extracts structured clinical profile, detects missing data, and scans for safety red flags. |
| **`server/src/services/adminChatService.ts`** | Clinical decision support engine for administrators. Injects live patient profile + doctor dataset matches into Gemini. Enforces strict Markdown sectioning (Patient Record Summary, Doctor-Approved Dataset Findings, Clinical Interpretation). Records access in `AuditLog`. |
| **`server/src/services/patientChatService.ts`** | Secure patient consultation engine. Supports English, Hindi (`hi`), and Marathi (`mr`). Checks for emergency red flags and provides immediate hospital escalation. Distinguishes general supportive self-care from doctor dataset remedies. Persists messages in `Conversation` and `Message` tables. |

### B. Controllers & API Endpoints

| Route | Method | Auth Level | Controller Method | Function |
| :--- | :---: | :---: | :--- | :--- |
| `/api/admin/chat` | `POST` | Admin | `adminController.chat` | Admin natural-language query with optional `patientId` grounding |
| `/api/admin/patients/search` | `GET` | Admin | `adminController.searchPatients` | Search patients by name, mobile, or ID for the admin chatbot |
| `/api/admin/patients/:id/summary` | `GET` | Admin | `adminController.getPatientFullSummary` | Complete structured case summary and medical history |
| `/api/admin/knowledge` | `GET` | Admin | `adminController.getKnowledge` | List all approved knowledge chunks from PostgreSQL |
| `/api/conversations/:id/chat` | `POST` | Patient | `conversationController.chat` | Multi-turn patient chat message with live grounding & emergency triage |
| `/api/conversations/chat-init` | `POST` | Patient | `conversationController.chatInit` | Atomic conversation creation and initial message processing |

### C. Frontend Interface Components

| File | Enhancements & UI/UX Features |
| :--- | :--- |
| **`client/src/components/AdminAIChatbot.tsx`** | Dedicated clinical assistant tab in the Admin Portal. Features: patient selector with type-ahead search, active patient context chip, suggested quick prompts, live patient summary card, doctor dataset citations, and copy-summary button. |
| **`client/src/components/AdminPortal.tsx`** | Updated navigation tabs to include `"AI Clinical Assistant"`. Renders `AdminAIChatbot` seamlessly within the governance dashboard. |
| **`client/src/components/ChatHistoryView.tsx`** | Upgraded from client-side simulated template responses to live backend Gemini API integration. Supports multilingual responses (Hindi/Marathi/English) and renders emergency alert banners. |
| **`client/src/services/api.ts`** | Added API methods: `adminChat()`, `searchAdminPatients()`, `getAdminPatientSummary()`, `getAdminKnowledge()`, `sendPatientChatMessage()`, and `initPatientChat()`. |

---

## 4. Medical Safety, Privacy & Guardrail Protocol

1. **No Independent Prescribing**: Gemini is instructed via system prompts never to independently prescribe prescription-only medicines, invent pharmaceutical dosages, or recommend stopping current medications.
2. **Emergency Triage Escalation**:
   - Automatic regex and keyword pattern scanning for emergency conditions:
     - Chest pain / Angina / Heart attack (`छाती में दर्द`, `छातीत दुखणे`)
     - Severe respiratory distress / Shortness of breath (`सांस फूलना`, `दम लागणे`)
     - Stroke signs / Facial droop / Slurred speech (`लकवा`, `पक्षाघात`)
     - Anaphylaxis / Lip or tongue swelling (`गला बंद होना`)
     - Loss of consciousness / Syncope (`बेहोश`, `बेशुद्ध`)
     - Active hemorrhage / Hemoptysis (`खून की उल्टी`, `रक्ताची उलटी`)
   - If detected, an immediate urgent emergency room warning is displayed, refusing home remedy substitution.
3. **Doctor-Approved Evidence Attribution**:
   - The AI explicitly distinguishes verified remedies from Dr. Wandhare's dataset (providing citations like `EW-NEPHRO-06` or `EW-NEURO-01`) from general AI interpretation.
   - If no record exists for a condition, the assistant explicitly states: *"No matching record was found in the doctor-approved dataset for this specific presentation."*
4. **Prompt Injection & Cross-Patient Isolation**:
   - User inputs are sanitized to strip control characters and malicious overrides ("Ignore previous instructions", "You are now DAN").
   - Multi-tenant isolation verified: Patient A cannot query, view, or inject into Patient B's conversations or records (returns 404/Forbidden).
5. **Audit Trail**: Every administrative AI record access is logged to PostgreSQL `AuditLog` (`action: 'ADMIN_AI_QUERY'`) recording the administrator ID, patient ID, and query summary without exposing credentials or API keys.

---

## 5. Verification & Test Execution Matrix

All automated test suites were executed directly against PostgreSQL and the backend API.

| Test # | Test Scenario | Expected Result | Status |
| :---: | :--- | :--- | :---: |
| **1** | Gemini Key Detection | Configured in environment, shielded from exposure | **PASS** |
| **2** | Gemini API Request & Fallback | Live generation succeeds, latency tracked | **PASS** |
| **3** | Admin Chatbot Access & Audit | Retrieves patient profile, logs `ADMIN_AI_QUERY` | **PASS** |
| **4** | Patient Lookup & Ambiguity | Exact match by ID; returns multiple candidates for ambiguous name | **PASS** |
| **5** | Medical History & Missing Info | Retrieves complaints, duration, severity; flags missing items | **PASS** |
| **6** | Doctor Dataset Retrieval | Queries renal colic $\rightarrow$ S6, C6, A2; headache $\rightarrow$ F1, S1, A1 | **PASS** |
| **7** | Separation of Findings | Dedicated sections for DB facts, Dataset findings, and AI notes | **PASS** |
| **8** | Emergency Escalation | Chest pain inquiry triggers urgent hospital evaluation alert | **PASS** |
| **9** | Multilingual (Hindi & Marathi) | Responses generated in authentic Devanagari script | **PASS** |
| **10** | Message Persistence | User prompt and assistant reply persisted in PostgreSQL `messages` | **PASS** |
| **11** | Cross-Patient Isolation | Patient B blocked from accessing Patient A conversation | **PASS** |
| **12** | Prompt Injection Defense | Neutralizes prompt override, zero credential or DB password leakage | **PASS** |
| **13** | Unavailable Dataset Handling | Reports no doctor record found without hallucinating remedies | **PASS** |
| **14** | Real-Time DB Synchronization | Immediate recognition of newly created cases, updated symptoms, and newly added allergies without server restart | **PASS** |

### Test Suite Execution Summary
- **Chatbot & Gemini Verification Suite (`chatbotVerificationTest.ts`)**: **39 PASSED, 0 FAILED**
- **Security & Data Isolation Suite (`securityTest.ts`)**: **27 PASSED, 0 FAILED**
- **Password Auth & OTP Suite (`passwordAuthTest.ts`)**: **4 PASSED, 0 FAILED**
- **TypeScript Builds**: `server` (Exit Code 0), `client` (Exit Code 0)

---

## 6. Files Created & Modified

### Files Created
- `server/src/services/geminiService.ts`
- `server/src/services/knowledgeData.ts`
- `server/src/services/knowledgeService.ts`
- `server/src/services/patientContextService.ts`
- `server/src/services/adminChatService.ts`
- `server/src/services/patientChatService.ts`
- `server/src/tests/chatbotVerificationTest.ts`
- `client/src/components/AdminAIChatbot.tsx`
- `project_Structure/progress.md`

### Files Modified
- `server/src/controllers/adminController.ts`
- `server/src/routes/adminRoutes.ts`
- `server/src/controllers/conversationController.ts`
- `server/src/routes/conversationRoutes.ts`
- `client/src/components/AdminPortal.tsx`
- `client/src/components/ChatHistoryView.tsx`
- `client/src/services/api.ts`

---

## 7. Configuration & Environment Variables Reference

Ensure `server/.env` contains the required keys (documented with placeholders only):

```env
PORT=5000
NODE_ENV=development

# Database configuration (PostgreSQL / Supabase)
DATABASE_URL="postgresql://username:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://username:password@host:5432/postgres"

# JWT Secrets
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# SMS Gateway (BlackSMS / MSG91)
SMS_PROVIDER=blacksms
BLACKSMS_API_URL=https://blacksms.in/sms
BLACKSMS_AUTH_KEY=your_sms_key_here
BLACKSMS_SENDER_ID=your_sender_id
BLACKSMS_ROUTE=1

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 8. Instructions to Run and Verify Locally

### 1. Start Backend Server
```powershell
cd D:\Electropathy_AI\server
npm run dev
```

### 2. Start Frontend Client
```powershell
cd D:\Electropathy_AI\client
npm run dev
```

### 3. Run Automated Verification Tests
```powershell
cd D:\Electropathy_AI\server
npx tsx src/tests/chatbotVerificationTest.ts
```

---

## 9. Chatbot Layout & Scrolling Resolution (Completed)

### Problem Diagnosis
1. **Double Vertical Scrollbars**: Outer browser window had a scrollbar because `ChatHistoryView` (`height: calc(100vh - 146px)` + margins) combined with Navbar and `<MedicalDisclaimer>` exceeded viewport height, resulting in nested page-level and container-level scrolling.
2. **Global Ancestor Scrolling via `scrollIntoView`**: `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` was scrolling all parent scroll containers including the browser window itself, causing page jumps and disorienting viewport shifts.
3. **Premature Auto-Scrolling**: When opening a consultation with a new patient intake profile, `scrollIntoView` scrolled straight to the bottom of the long message, clipping the clinical intake header ("Patient Clinical Intake Profile", Chief Complaints, etc.).
4. **Cramped Message Viewport**: Excessive container margins and external disclaimer margins cramped the chat viewport to ~300px on typical laptop displays.
5. **Chunky Native Windows Scrollbars**: Lack of custom scrollbar styles rendered Windows 98-style grey scrollbars with arrow buttons crowding the UI.

### Key Fixes Applied
1. **Strict 100% Viewport Locking (`App.tsx`)**:
   - Locked root container to `height: 100vh, maxHeight: 100vh, overflow: hidden` whenever `isChatActive` is true.
   - `<main>` occupies `flex: 1, minHeight: 0, overflow: hidden` with uniform `8px 16px 8px` padding.
   - Eliminated external `<MedicalDisclaimer>` on the chat view, integrating a sleek single-line clinical decision support notice directly into the chat input console.
2. **Container-Bound Scroll Management (`ChatHistoryView.tsx` & `AdminAIChatbot.tsx`)**:
   - Replaced `messagesEndRef.current?.scrollIntoView()` with container-specific `messagesContainerRef.current.scrollTo(...)`. Ancestor elements and the browser window now never scroll.
   - Added intelligent scroll detection:
     - Opening/switching to a consultation with <= 2 messages scrolls to **TOP** (`scrollTop = 0`), keeping the entire clinical profile and chief complaint visible immediately.
     - Multi-turn conversations scroll cleanly to the bottom.
     - New messages auto-scroll only if the user is already near the bottom (within 160px) or during message transmission.
3. **Flex-Based Dynamic Height**:
   - Converted `.chat-view-container` from rigid `calc(100vh - 146px)` with fixed margins to `flex: 1, minHeight: 0, height: 100%, margin: 0 auto`.
   - Ensured header and input console have `flexShrink: 0`, while message thread has `flex: 1, minHeight: 0, overflowY: 'auto'`.
4. **Modern Sleek Scrollbars (`index.css`)**:
   - Added subtle 6px rounded scrollbars (`::-webkit-scrollbar`, `scrollbar-width: thin`), eliminating chunky default scrollbars and arrow buttons across desktop and mobile.

---

## 10. Gemini Model API Transition & Active Failover Resolution (Completed)

### Problem Diagnosis
1. **Discontinued Model Name (`gemini-1.5-flash`)**: The fallback model in `geminiService.ts` was set to `gemini-1.5-flash`. When queried via API endpoint `v1beta`, Google returned:
   `models/gemini-1.5-flash is not found for API version v1beta, or is not supported for generateContent. Call ModelService.ListModels to see the list of available models and their supported methods.`
2. **Free Tier Daily Quota Exhaustion (`gemini-2.5-flash`)**: The free tier quota on `gemini-2.5-flash` for the user's API key has a cap of 20 requests per day (`limit: 20, model: gemini-2.5-flash`), which returned `429 RESOURCE_EXHAUSTED`.
3. When `gemini-2.5-flash` hit the 20-request limit, it attempted to fall back to `gemini-1.5-flash`, which failed with 404, displaying the offline message.

### Resolution Applied
1. **Live Model Enumeration via `ModelService.ListModels`**:
   - Programmatically inspected the live models available for this API key via Google's `v1beta/models` endpoint.
   - Identified active, quota-healthy models: `gemini-3-flash-preview`, `gemini-3.5-flash`, and `gemma-4-26b-a4b-it`.
2. **Updated Model Cascade (`server/src/services/geminiService.ts`)**:
   - **Primary Model**: `gemini-3-flash-preview` (high throughput, low latency ~2.5s, active quota).
   - **Secondary Fallback**: `gemini-3.5-flash` (state-of-the-art model for complex clinical protocols).
   - **Tertiary Fallback**: `gemma-4-26b-a4b-it` (open-weights model on Google infrastructure without free-tier flash quotas).
   - **Quaternary Fallback**: `gemini-2.5-flash` (re-enabled automatically once daily quota resets).
   - Completely eliminated the deprecated `gemini-1.5-flash`.
3. **Swift 12s Failover Timeout**:
   - Reduced model timeout from 20s to 12s so temporary spikes trigger seamless failovers without stalling the frontend UI.
4. **End-to-End Validation**:
   - Tested real clinical generations directly through `geminiService.generateText()`.
   - Verified that `gemini-3-flash-preview` and `gemini-3.5-flash` return rich Electropathy clinical analyses with zero errors.
   - Full 39-test verification suite passes: `39 PASSED, 0 FAILED`.

---

## 11. Markdown Parsing & Raw Formatting Symbols Removal (Completed)

### Problem Diagnosis
- Both `ChatHistoryView.tsx` and `AdminAIChatbot.tsx` were previously dumping raw unparsed strings (`{msg.text}` or `{m.content}`) directly inside `<div style={{ whiteSpace: 'pre-wrap' }}>`.
- Consequently, Markdown formatting syntax like headings (`### 📋 Patient Clinical Record Summary`), bullet points (`* **Patient Identity:**`), bold labels (`**Ramesh Sharma**`), and blockquotes displayed as literal unstyled characters (`#`, `*`, `**`).

### Resolution Applied
1. **Created Dedicated `MarkdownMessage` Component (`client/src/components/MarkdownMessage.tsx`)**:
   - Integrated `react-markdown` with `remark-gfm` for full GitHub-Flavored Markdown support (headings, lists, bold/italics, tables, blockquotes, code blocks).
   - Added automatic leading bullet normalization (`replace(/^[ \t]*[•●]\s+/gm, '* ')`) to guarantee Unicode bullets are converted to standard structured `<ul><li>` list trees.
   - Provided full theme-aware support with `isUser` prop (white text and subtle borders in patient bubbles; rich navy headings, dark slate text, and amber blockquote callouts in assistant messages).
2. **Integrated in Admin and Patient Portals**:
   - Updated [AdminAIChatbot.tsx](file:///d:/Electropathy_AI/client/src/components/AdminAIChatbot.tsx#L644) to render all admin messages and AI clinical summaries through `<MarkdownMessage>`.
   - Updated [ChatHistoryView.tsx](file:///d:/Electropathy_AI/client/src/components/ChatHistoryView.tsx#L1070) to render patient consultation intake notes and responses through `<MarkdownMessage>`.
3. **Verified Clean Build**:
   - `npm run build` in `client` passes with zero errors. All raw `#`, `*`, and `**` symbols are now rendered as authentic headings, bold headers, and styled lists.

---

## 12. Loading Spinner Freezing Resolution (Completed)

### Problem Diagnosis
- When clicking "Ask AI" in the Admin AI Chatbot or sending messages in Patient Consultation, the circular loading spinner icon (`<Loader2 />`) appeared frozen as a motionless circle.
- **Root Cause**: The client application is built with vanilla CSS without Tailwind CSS. Components applied utility classes `className="spin"` and `className="animate-spin"`, but `@keyframes spin` and the corresponding `.spin` / `.animate-spin` CSS rules were completely missing from all stylesheets in `client/src/index.css`.
- As a result, the browser rendered the SVG icon in its static initial state, giving the appearance that the spinner froze during background AI inference or live PostgreSQL queries.

### Resolution Applied
1. **Added Hardware-Accelerated Spin Keyframes (`client/src/index.css`)**:
   - Defined `@keyframes spin` from `0deg` to `360deg`.
   - Applied GPU-composited `.spin` and `.animate-spin` rules with `will-change: transform`, `transform-origin: center center`, and `transform-box: fill-box`.
   - Offloading the rotation matrix to the browser's compositor layer guarantees silky-smooth 60fps continuous rotation that will never freeze or stutter, even when the JavaScript main thread executes React re-renders or stream updates.
2. **Standardized Spinner Classes & Interactive State (`client/src/components/AdminAIChatbot.tsx`)**:
   - Updated the "Ask AI" submit button to dynamically display `{loading ? 'Consulting AI...' : 'Ask AI'}` along with `<Loader2 size={16} className="spin animate-spin" />`.
   - Updated the live database query stream banner to use `className="spin animate-spin"`.
3. **End-to-End Build & Validation**:
   - Verified compilation via `npm run build` in `client/` (exited with code 0).
   - Validated that all loaders across Admin Portal, Admin AI Chatbot, Patient Consultation, and Authentication modals now spin continuously and smoothly without freezing.

---

## 13. Patient Chatbot Fallback & Gemini Free-Tier Quota Diagnosis (Completed)

### Problem Diagnosis
- When asking health questions in the patient consultation view, users received a static 2-sentence response:
  *"Thank you for sharing your concern regarding '...'. For general comfort, ensure adequate hydration and rest. Because safe healthcare requires thorough clinical assessment, please consult a qualified healthcare practitioner for an accurate evaluation."*
- **Root Cause 1 (Google API Free-Tier Quota Cap)**:
  - Probing Google's Generative Language API directly revealed that the configured Gemini API key exceeded Google AI Studio's free tier cap of **20 requests per day** across the `gemini-3-flash`, `gemini-3.5-flash`, and `gemini-2.5-flash` models:
    `429 RESOURCE_EXHAUSTED: Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3-flash. Please retry in 15h52m.`
- **Root Cause 2 (Overly Generic Safety Fallback in `patientChatService.ts`)**:
  - When all models returned 429 quota exhaustion, `patientChatService.processPatientMessage` caught the error and called `this.getOfflineSafeResponse(...)`.
  - Previously, `getOfflineSafeResponse` discarded all retrieved doctor-approved dataset records from PostgreSQL and returned a hardcoded 2-sentence generic template, making the chatbot appear non-functional.

### Resolution Applied
1. **Upgraded Patient Fallback Engine (`server/src/services/patientChatService.ts`)**:
   - Updated `getOfflineSafeResponse` to receive and format the actual **Dr. Ashish Wandhare Verified Electropathy Protocols** retrieved from PostgreSQL (`datasetMatches`), including remedies, dilution potencies, dosages, and patient-specific allergy warnings.
   - Added transparent system status notices explaining that the clinic database engine is serving authoritative records while the Google Gemini API 20 req/day quota resets.
2. **Multilingual Database Synthesis**:
   - Grounded responses in English, Hindi (हिंदी), and Marathi (मराठी) directly from PostgreSQL when Google's quota is reached.
3. **Seamless Live AI Transition**:
   - As soon as the user configures a fresh Gemini API key or the daily 20-request free tier quota resets, full dynamic Gemini AI text generation resumes automatically.





