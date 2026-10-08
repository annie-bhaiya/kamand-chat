export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_key: string | null;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  left_at: string | null;
  last_read_seq: number;
  profiles: Profile;
}

export interface Attachment {
  id: string;
  message_id: string | null;
  conversation_id: string;
  uploader_id: string;
  object_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  scan_status: 'unscanned' | 'clean' | 'rejected';
  created_at: string;
}

export interface Reaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  seq: number;
  sender_id: string;
  client_message_id: string;
  body: string;
  kind: 'text' | 'attachment';
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  attachments?: Attachment[];
  message_reactions?: Reaction[];
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  created_by: string;
  last_seq: number;
  last_message_at: string | null;
  last_activity_at: string;
  created_at: string;
  conversation_members: ConversationMember[];
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user: {
    id: string;
    email?: string;
    user_metadata?: {
      display_name?: string;
      [key: string]: unknown;
    };
  };
}

export interface ApiResponse<T> {
  data: T;
  next_cursor?: string | number | null;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
  request_id?: string;
}

export interface TypingEvent {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

export interface MessageReactionEvent {
  message_id: string;
  user_id: string;
  emoji: string;
  removed: boolean;
}

export interface ConversationReadEvent {
  conversation_id: string;
  user_id: string;
  last_read_seq: number;
}
