import {
  ApiResponse,
  AuthSession,
  Conversation,
  Message,
  Profile,
  Attachment,
} from '@/types/chat';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('fc_access_token');
      this.refreshToken = localStorage.getItem('fc_refresh_token');
    }
  }

  setSession(session: { access_token: string; refresh_token: string } | null) {
    if (session) {
      this.accessToken = session.access_token;
      this.refreshToken = session.refresh_token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('fc_access_token', session.access_token);
        localStorage.setItem('fc_refresh_token', session.refresh_token);
      }
    } else {
      this.accessToken = null;
      this.refreshToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('fc_access_token');
        localStorage.removeItem('fc_refresh_token');
      }
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('fc_access_token');
    }
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    if (!this.refreshToken && typeof window !== 'undefined') {
      this.refreshToken = localStorage.getItem('fc_refresh_token');
    }
    return this.refreshToken;
  }

  getBaseUrl(): string {
    return API_BASE_URL;
  }

  async refreshTokenIfNeeded(): Promise<string | null> {
    const currentRefresh = this.getRefreshToken();
    if (!currentRefresh) return null;

    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: currentRefresh }),
        });

        if (!response.ok) {
          this.setSession(null);
          return null;
        }

        const json = await response.json();
        const data = json.data;
        if (data && data.session) {
          this.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          return data.session.access_token;
        }
        return null;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const headers = new Headers(options.headers || {});

    const token = this.getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (res.status === 204) {
      return { data: null as unknown as T };
    }

    if (res.status === 401 && !isRetry && this.getRefreshToken() && !endpoint.includes('/api/auth/')) {
      const newToken = await this.refreshTokenIfNeeded();
      if (newToken) {
        return this.request<T>(endpoint, options, true);
      }
    }

    const contentType = res.headers.get('content-type');
    let json: any = null;
    if (contentType && contentType.includes('application/json')) {
      json = await res.json();
    } else {
      const text = await res.text();
      try {
        json = JSON.parse(text);
      } catch {
        json = { error: { message: text || res.statusText } };
      }
    }

    if (!res.ok) {
      const message = json?.error?.message || `Request failed with status ${res.status}`;
      const code = json?.error?.code || 'ERROR';
      const error = new Error(message) as Error & { code?: string; details?: any };
      error.code = code;
      error.details = json?.error?.details;
      throw error;
    }

    return json;
  }

  // --- Health Checks ---
  async checkHealth(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }

  async checkReady(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE_URL}/ready`);
    if (!res.ok) throw new Error('Readiness check failed');
    return res.json();
  }

  // --- Auth API ---
  async checkUser(email: string): Promise<{ exists: boolean; display_name?: string; username?: string }> {
    const res = await this.request<{ exists: boolean; display_name?: string; username?: string }>('/api/auth/check', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return res.data;
  }

  async register(input: { email: string; password: string; display_name: string }) {
    return this.request<{
      user: any;
      session: AuthSession | null;
      requires_email_confirmation: boolean;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async login(input: { email: string; password: string; display_name?: string }) {
    const res = await this.request<{
      user: any;
      session: AuthSession | null;
      auto_created?: boolean;
      requires_email_confirmation?: boolean;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.data?.session) {
      this.setSession({
        access_token: res.data.session.access_token,
        refresh_token: res.data.session.refresh_token,
      });
    }
    return res;
  }

  async refresh(refreshToken: string) {
    const res = await this.request<{
      user: any;
      session: AuthSession;
    }>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (res.data?.session) {
      this.setSession({
        access_token: res.data.session.access_token,
        refresh_token: res.data.session.refresh_token,
      });
    }
    return res;
  }

  async logout(refreshToken: string) {
    try {
      await this.request<void>('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } finally {
      this.setSession(null);
    }
  }

  async getMe() {
    return this.request<{
      user: any;
      profile: Profile;
    }>('/api/auth/me');
  }

  // --- Users API ---
  async searchUsers(query: string = '', afterId?: string, limit = 50) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (afterId) params.set('after_id', afterId);
    params.set('limit', String(limit));
    return this.request<Profile[]>(`/api/users?${params.toString()}`);
  }

  async getUser(userId: string) {
    return this.request<Profile>(`/api/users/${userId}`);
  }

  async updateMe(input: {
    username?: string;
    display_name?: string;
    avatar_key?: string | null;
  }) {
    return this.request<Profile>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // --- Conversations API ---
  async getConversations(cursor?: string | null, limit = 50) {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', String(limit));
    return this.request<Conversation[]>(`/api/conversations?${params.toString()}`);
  }

  async createDirectConversation(userId: string) {
    return this.request<Conversation>('/api/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async createGroupConversation(title: string, memberIds: string[]) {
    return this.request<Conversation>('/api/conversations/groups', {
      method: 'POST',
      body: JSON.stringify({ title, member_ids: memberIds }),
    });
  }

  async getConversation(id: string) {
    return this.request<Conversation>(`/api/conversations/${id}`);
  }

  async renameGroup(id: string, title: string) {
    return this.request<Conversation>(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async addGroupMember(id: string, userId: string) {
    return this.request<any>(`/api/conversations/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async removeGroupMember(id: string, userId: string) {
    return this.request<any>(`/api/conversations/${id}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // --- Messages API ---
  async getMessages(
    conversationId: string,
    options: { before_seq?: number; after_seq?: number; limit?: number } = {}
  ) {
    const params = new URLSearchParams();
    if (options.before_seq !== undefined) params.set('before_seq', String(options.before_seq));
    if (options.after_seq !== undefined) params.set('after_seq', String(options.after_seq));
    if (options.limit !== undefined) params.set('limit', String(options.limit));
    return this.request<Message[]>(
      `/api/conversations/${conversationId}/messages?${params.toString()}`
    );
  }

  async searchMessages(conversationId: string, q: string, beforeSeq?: number, limit = 50) {
    const params = new URLSearchParams({ q });
    if (beforeSeq !== undefined) params.set('before_seq', String(beforeSeq));
    params.set('limit', String(limit));
    return this.request<Message[]>(
      `/api/conversations/${conversationId}/messages/search?${params.toString()}`
    );
  }

  async sendMessage(
    conversationId: string,
    input: {
      client_message_id: string;
      body?: string;
      attachment_ids?: string[];
    }
  ) {
    return this.request<Message>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        client_message_id: input.client_message_id,
        body: input.body ?? '',
        attachment_ids: input.attachment_ids ?? [],
      }),
    });
  }

  async markRead(conversationId: string, seq: number) {
    return this.request<{ last_read_seq: number }>(`/api/conversations/${conversationId}/read`, {
      method: 'POST',
      body: JSON.stringify({ seq }),
    });
  }

  async editMessage(messageId: string, body: string) {
    return this.request<Message>(`/api/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
  }

  async deleteMessage(messageId: string) {
    return this.request<{ id: string; conversation_id: string; deleted_at: string; seq: number }>(
      `/api/messages/${messageId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async addReaction(messageId: string, emoji: string) {
    return this.request<any>(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async removeReaction(messageId: string, emoji: string) {
    return this.request<any>(`/api/messages/${messageId}/reactions`, {
      method: 'DELETE',
      body: JSON.stringify({ emoji }),
    });
  }

  // --- Attachments API ---
  async uploadAttachment(conversationId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<Attachment>(`/api/conversations/${conversationId}/attachments`, {
      method: 'POST',
      body: formData,
    });
  }

  async getAttachmentUrl(attachmentId: string) {
    return this.request<{ signedUrl: string; expires_in: number }>(
      `/api/attachments/${attachmentId}/url`
    );
  }

  async deleteDraftAttachment(attachmentId: string) {
    return this.request<void>(`/api/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
