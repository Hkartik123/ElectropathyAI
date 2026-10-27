export type UserType = 'patient' | 'practitioner' | 'student' | 'researcher';
export type UserRole = 'patient' | 'practitioner' | 'admin';
export type PreferredLang = 'en' | 'hi' | 'mr';

export interface User {
  id: string;
  mobileNumber: string;
  fullName?: string;
  email?: string;
  userType?: UserType;
  preferredLang: PreferredLang;
  role: UserRole;
  isActive?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  isNewUser?: boolean;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  user?: User;
}

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
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  feedback?: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  language: string;
  messageCount: number;
  lastMessage?: { content: string; role: string; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail {
  id: string;
  userId: string;
  title: string;
  language: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface AdminOverview {
  users: {
    total: number;
    active: number;
    inactive: number;
    newLast7Days: number;
  };
  conversations: {
    totalConversations: number;
    totalMessages: number;
  };
  patientCases: {
    total: number;
    byStatus: Record<string, number>;
  };
  knowledgeBase: {
    totalDocuments: number;
    totalChunks: number;
  };
  recentActivities?: AuditLogItem[];
}

export interface AuditLogItem {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
  admin?: { id: string; fullName: string; email: string; mobileNumber: string };
}
