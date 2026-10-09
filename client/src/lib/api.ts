import {
ApiResponse,
Attachment,
AuthSession,
CampusEvent,
CampusRoom,
CampusTicket,
Conversation,
Message,
MessDayMenu,
MoodleAssignment,
Profile,
} from '@/types/chat';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private sessionVersion = 0;

  private readToken(key: string) {
    try { return typeof window === 'undefined' ? null : localStorage.getItem(key); }
    catch { return null; }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = this.readToken('fc_access_token');
      this.refreshToken = this.readToken('fc_refresh_token');
    }
  }

  setSession(session: { access_token: string; refresh_token: string } | null) {
    this.sessionVersion += 1;
    if (session) {
      this.accessToken = session.access_token;
      this.refreshToken = session.refresh_token;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('fc_access_token', session.access_token);
          localStorage.setItem('fc_refresh_token', session.refresh_token);
        } catch { /* The session remains usable in memory when browser storage is blocked. */ }
      }
    } else {
      this.accessToken = null;
      this.refreshToken = null;
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('fc_access_token');
          localStorage.removeItem('fc_refresh_token');
        } catch { /* Browser storage may be unavailable. */ }
      }
    }
  }

  getAccessToken(): string | null {
    if (!this.accessToken && typeof window !== 'undefined') {
      this.accessToken = this.readToken('fc_access_token');
    }
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    if (!this.refreshToken && typeof window !== 'undefined') {
      this.refreshToken = this.readToken('fc_refresh_token');
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
    const version = this.sessionVersion;

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: currentRefresh }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          if ((response.status === 400 || response.status === 401) && version === this.sessionVersion) {
            this.setSession(null);
            if (typeof window !== 'undefined') window.dispatchEvent(new Event('kamand:session-expired'));
          }
          return null;
        }

        const json = await response.json();
        const data = json.data;
        if (data && data.session && version === this.sessionVersion) {
          this.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          if (typeof window !== 'undefined') window.dispatchEvent(new Event('kamand:session-refreshed'));
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
      signal: options.signal || AbortSignal.timeout(20000),
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
    let json: ApiResponse<T> & { error?: { message?: string; code?: string; details?: unknown } };
    if (contentType && contentType.includes('application/json')) {
      json = await res.json();
    } else {
      const text = await res.text();
      try {
        json = JSON.parse(text);
      } catch {
        json = { data: null as T, error: { message: text || res.statusText } };
      }
    }

    if (!res.ok) {
      const message = json?.error?.message || `Request failed with status ${res.status}`;
      const code = json?.error?.code || 'ERROR';
      const error = new Error(message) as Error & { code?: string; details?: unknown };
      error.code = code;
      error.details = json?.error?.details;
      throw error;
    }

    return json;
  }

  // --- Health Checks ---
  async checkHealth(): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(8000) });
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
    const version = ++this.sessionVersion;
    const res = await this.request<{
      user: AuthSession['user'];
      session: AuthSession | null;
      requires_email_confirmation: boolean;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.data?.session) {
      if (version !== this.sessionVersion) throw new Error('Sign-in was cancelled.');
      this.setSession(res.data.session);
    }
    return res;
  }

  async login(input: { email: string; password: string; display_name?: string }) {
    const version = ++this.sessionVersion;
    const res = await this.request<{
      user: AuthSession['user'];
      session: AuthSession | null;
      auto_created?: boolean;
      requires_email_confirmation?: boolean;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (res.data?.session) {
      if (version !== this.sessionVersion) throw new Error('Sign-in was cancelled.');
      this.setSession({
        access_token: res.data.session.access_token,
        refresh_token: res.data.session.refresh_token,
      });
    }
    return res;
  }

  async refresh(refreshToken: string) {
    const res = await this.request<{
      user: AuthSession['user'];
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
    const token = this.getAccessToken();
    this.setSession(null);
    // Capture the old authorization before clearing locally. A delayed logout response
    // must not clear a newer sign-in, and a pending refresh cannot restore this session.
    await this.request<void>('/api/auth/logout', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  }

  async getMe() {
    return this.request<{
      user: AuthSession['user'];
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
    hostel?: string | null;
    hostel_block?: string | null;
    branch?: string | null;
    mess?: string | null;
    chat_only?: boolean;
  }) {
    return this.request<Profile>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<Profile>('/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
  }

  async deleteAvatar() {
    return this.request<Profile>('/api/users/me/avatar', {
      method: 'DELETE',
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
    return this.request<unknown>(`/api/conversations/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  async removeGroupMember(id: string, userId: string) {
    return this.request<unknown>(`/api/conversations/${id}/members/${userId}`, {
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
    return this.request<unknown>(`/api/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }

  async removeReaction(messageId: string, emoji: string) {
    return this.request<unknown>(`/api/messages/${messageId}/reactions`, {
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

  async getConversationAttachments(conversationId: string) {
    return this.request<Attachment[]>(
      `/api/conversations/${conversationId}/attachments`
    );
  }

  async getUserProfile(userId: string) {
    return this.request<Profile>(`/api/users/${userId}`);
  }

  // --- Campus Scoped Rooms API ---
  async getCampusRooms(category?: string, campus?: string) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (campus) params.set('campus', campus);
    return this.request<CampusRoom[]>(`/api/campus/rooms?${params.toString()}`);
  }

  async getCampusRoom(slug: string) {
    return this.request<CampusRoom>(`/api/campus/rooms/${slug}`);
  }

  async joinCampusRoomConversation(slug: string) {
    return this.request<{ conversation: Conversation; room: CampusRoom; isAdmin?: boolean }>(
      `/api/campus/rooms/${slug}/conversation`,
      {
        method: 'POST',
      }
    );
  }

  async getCampusRoomPermissions(slug: string) {
    return this.request<{
      roomSlug: string;
      isAdmin: boolean;
      canBookEvents: boolean;
      canResolveTickets: boolean;
      canBroadcastMoodle: boolean;
      canUpdateMenu: boolean;
    }>(`/api/campus/rooms/${slug}/permissions`);
  }

  // --- Gymkhana Events API ---
  async getCampusEvents(venue?: string, category?: string) {
    const params = new URLSearchParams();
    if (venue) params.set('venue', venue);
    if (category) params.set('category', category);
    return this.request<CampusEvent[]>(`/api/campus/events?${params.toString()}`);
  }

  async createCampusEvent(input: {
    title: string;
    description?: string;
    category: string;
    organizer: string;
    venue: string;
    date: string;
    startTime: string;
    endTime: string;
  }) {
    return this.request<CampusEvent>('/api/campus/events', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateCampusEventStatus(id: string, status: string) {
    return this.request<CampusEvent>(`/api/campus/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateCampusEvent(id: string, input: Parameters<ApiClient['createCampusEvent']>[0]) {
    return this.request<CampusEvent>(`/api/campus/events/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
  }

  // --- Hostels & Messes Tickets API ---
  async getCampusTickets(options: {
    scope?: string;
    campus?: string;
    status?: string;
    cluster?: string;
  } = {}) {
    const params = new URLSearchParams();
    if (options.scope) params.set('scope', options.scope);
    if (options.campus) params.set('campus', options.campus);
    if (options.status) params.set('status', options.status);
    if (options.cluster) params.set('cluster', options.cluster);
    return this.request<CampusTicket[]>(`/api/campus/tickets?${params.toString()}`);
  }

  async createCampusTicket(input: {
    title: string;
    description?: string;
    scope: 'hostel' | 'mess';
    category: string;
    campus: 'North' | 'South';
    clusterOrMess: string;
    specificLocation: string;
  }) {
    return this.request<CampusTicket>('/api/campus/tickets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async upvoteCampusTicket(id: string) {
    return this.request<{ ticket: CampusTicket; hasUpvoted: boolean }>(
      `/api/campus/tickets/${id}/upvote`,
      {
        method: 'POST',
      }
    );
  }

  async updateCampusTicketStatus(id: string, status: string) {
    return this.request<CampusTicket>(`/api/campus/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // --- Moodle Integration API ---
  async getMoodleData(courseCode: string) {
    return this.request<{
      courseCode: string;
      moodleHost: string;
      lastSynced: string | null;
      assignments: MoodleAssignment[];
    }>(`/api/campus/moodle/${courseCode}`);
  }

  async syncMoodle(courseCode: string) {
    return this.request<{
      success: boolean;
      courseCode: string;
      alert: MoodleAssignment;
      syncedAt: string;
    }>('/api/campus/moodle/sync', {
      method: 'POST',
      body: JSON.stringify({ courseCode }),
    });
  }

  // --- Mess Menus API ---
  async getMessMenu(messSlug: string) {
    return this.request<MessDayMenu>(`/api/campus/messes/${messSlug}/menu`);
  }
}

export const api = new ApiClient();
