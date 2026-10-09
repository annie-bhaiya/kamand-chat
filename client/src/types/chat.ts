export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_key: string | null;
  hostel?: string | null;
  hostel_block?: string | null;
  branch?: string | null;
  mess?: string | null;
  chat_only?: boolean;
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
  campus_room_slug?: string | null;
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
    app_metadata?: { campus_rooms?: string[]; simulation?: boolean };
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

export interface CampusRoom {
  id: string;
  slug: string;
  name: string;
  category: 'clubs' | 'courses' | 'hostels' | 'branches' | 'messes';
  subcategory: string;
  campus?: 'North' | 'South' | 'Both';
  description: string;
  tags: string[];
  courseCode?: string;
  hostelCluster?: string;
  hostelBlock?: string;
}

export interface CampusEvent {
  roomSlug?: string;
  canManage?: boolean;
  updatedAt?: string;
  id: string;
  title: string;
  description: string;
  category: 'Club Workshop' | 'Fest Event' | 'Sports Tournament' | 'Placement & Tech Talk' | 'General';
  organizer: string;
  venue: 'Auditorium A1/A2' | 'A13 Hall' | 'South Campus Grounds' | 'SCEE Seminar Hall' | 'Sports Complex' | 'Other';
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'conflict' | 'completed' | 'cancelled';
  createdBy?: string;
  createdAt: string;
}

export interface CampusTicket {
  roomSlug?: string;
  canManage?: boolean;
  updatedAt?: string;
  history?: Array<{ status: string; createdAt: string }>;
  id: string;
  title: string;
  description: string;
  scope: 'hostel' | 'mess';
  category: string;
  campus: 'North' | 'South';
  clusterOrMess: string;
  specificLocation: string;
  status: 'Reported' | 'Under Investigation' | 'Resolved by Warden/Caretaker';
  upvotes: number;
  upvotedBy: string[];
  createdBy: string;
  creatorName: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface MoodleAssignment {
  id: string;
  courseCode: string;
  title: string;
  description: string;
  type: 'assignment' | 'quiz' | 'lab' | 'grade' | 'announcement';
  dueDate: string;
  weightage?: string;
  moodleUrl: string;
  status: 'pending' | 'submitted' | 'graded';
}

export interface MessDayMenu {
  messName: string;
  day: string;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
  specialNotice?: string;
}
