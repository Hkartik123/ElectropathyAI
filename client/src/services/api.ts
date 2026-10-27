import { 
  AuthResponse, 
  User, 
  PatientCase, 
  ConversationSummary, 
  ConversationDetail, 
  Message,
  AdminOverview,
  AuditLogItem
} from '../types';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

class ApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('electropathy_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- Auth & Login ---

  async loginWithPassword(mobileNumber: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, password }),
    });
    const data: AuthResponse = await res.json();
    if (data.success && data.tokens?.accessToken) {
      localStorage.setItem('electropathy_token', data.tokens.accessToken);
      if (data.tokens.refreshToken) {
        localStorage.setItem('electropathy_refresh_token', data.tokens.refreshToken);
      }
    }
    return data;
  }

  async sendOtp(mobileNumber: string): Promise<{ success: boolean; message: string; cooldownSeconds?: number; devOtp?: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber }),
    });
    return res.json();
  }

  async verifyOtp(mobileNumber: string, otp: string): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, otp }),
    });
    const data: AuthResponse = await res.json();
    if (data.success && data.tokens?.accessToken) {
      localStorage.setItem('electropathy_token', data.tokens.accessToken);
      if (data.tokens.refreshToken) {
        localStorage.setItem('electropathy_refresh_token', data.tokens.refreshToken);
      }
    }
    return data;
  }

  async resetPassword(mobileNumber: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, otp, newPassword }),
    });
    return res.json();
  }

  async updateProfile(profileData: {
    fullName: string;
    email?: string;
    userType: string;
    preferredLang: string;
    password?: string;
  }): Promise<{ success: boolean; user: User; message: string }> {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(profileData),
    });
    return res.json();
  }

  async getMe(): Promise<{ success: boolean; user: User }> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('electropathy_token');
      localStorage.removeItem('electropathy_refresh_token');
      localStorage.removeItem('electropathy_admin_token');
    }
  }

  // --- Patient Intake & History ---

  async createPatientCase(data: Partial<PatientCase>): Promise<{ success: boolean; case: PatientCase; message: string }> {
    const res = await fetch(`${API_BASE_URL}/patients`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async updatePatientCase(id: string, data: Partial<PatientCase>): Promise<{ success: boolean; case: PatientCase; message: string }> {
    const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async getPatientCases(): Promise<{ success: boolean; cases: PatientCase[]; count: number }> {
    const res = await fetch(`${API_BASE_URL}/patients`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  // --- User Saved Conversations & History ---

  async getConversations(page = 1, limit = 20): Promise<{ success: boolean; conversations: ConversationSummary[]; total: number; page: number; totalPages: number }> {
    const res = await fetch(`${API_BASE_URL}/conversations?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async createConversation(data: { title?: string; language?: string; initialMessage?: string }): Promise<{ success: boolean; conversation?: ConversationDetail; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async getConversation(id: string): Promise<{ success: boolean; conversation: ConversationDetail }> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async updateConversationTitle(id: string, title: string): Promise<{ success: boolean; conversation: any }> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ title }),
    });
    return res.json();
  }

  async deleteConversation(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.json();
  }

  async sendMessage(conversationId: string, content: string, role: 'user' | 'assistant' = 'user'): Promise<{ success: boolean; message: Message }> {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content, role }),
    });
    return res.json();
  }

  // --- Administrator APIs ---

  private getAdminHeaders(): HeadersInit {
    const token = localStorage.getItem('electropathy_admin_token') || localStorage.getItem('electropathy_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async adminLogin(email: string, password: string): Promise<{ success: boolean; tokens?: { accessToken: string; refreshToken: string }; admin?: any; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success && data.tokens?.accessToken) {
      localStorage.setItem('electropathy_admin_token', data.tokens.accessToken);
    }
    return data;
  }

  async adminGetOverview(): Promise<{ success: boolean; overview: AdminOverview }> {
    const res = await fetch(`${API_BASE_URL}/admin/overview`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  async adminGetUsers(params: { search?: string; status?: string; role?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams({
      search: params.search || '',
      status: params.status || '',
      role: params.role || '',
      page: String(params.page || 1),
      limit: String(params.limit || 20),
    }).toString();

    const res = await fetch(`${API_BASE_URL}/admin/users?${query}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  async adminGetUserDetails(userId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  async adminUpdateUserStatus(userId: string, isActive: boolean) {
    const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return res.json();
  }

  async adminGetConversations(params: { search?: string; userId?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams({
      search: params.search || '',
      userId: params.userId || '',
      page: String(params.page || 1),
      limit: String(params.limit || 20),
    }).toString();

    const res = await fetch(`${API_BASE_URL}/admin/conversations?${query}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  async adminGetConversationDetails(convId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/conversations/${convId}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  async adminGetPatientCases(params: { search?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams({
      search: params.search || '',
      status: params.status || '',
      page: String(params.page || 1),
      limit: String(params.limit || 20),
    }).toString();

    const res = await fetch(`${API_BASE_URL}/admin/patient-cases?${query}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  async adminGetPatientCaseDetails(caseId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/patient-cases/${caseId}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  async adminGetAuditLogs(page = 1, limit = 50): Promise<{ success: boolean; logs: AuditLogItem[]; total: number; totalPages: number }> {
    const res = await fetch(`${API_BASE_URL}/admin/audit-logs?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  // --- Admin AI Assistant & Clinical Decision Support ---

  async adminChat(data: { query: string; patientId?: string }) {
    const res = await fetch(`${API_BASE_URL}/admin/chat`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  }

  async searchAdminPatients(q = '', limit = 10) {
    const query = new URLSearchParams({ q, limit: String(limit) }).toString();
    const res = await fetch(`${API_BASE_URL}/admin/patients/search?${query}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  async getAdminPatientSummary(patientId: string) {
    const res = await fetch(`${API_BASE_URL}/admin/patients/${patientId}/summary`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  async getAdminKnowledge(page = 1, limit = 50) {
    const res = await fetch(`${API_BASE_URL}/admin/knowledge?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    return res.json();
  }

  // --- Patient AI Consultation ---

  async sendPatientChatMessage(conversationId: string, content: string, preferredLang?: string) {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content, preferredLang }),
    });
    return res.json();
  }

  async initPatientChat(content: string, language?: string, title?: string) {
    const res = await fetch(`${API_BASE_URL}/conversations/chat-init`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content, language, title }),
    });
    return res.json();
  }
}

export const api = new ApiService();
