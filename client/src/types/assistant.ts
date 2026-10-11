export interface AssistantReply {
  sessionId: string;
  status: 'completed' | 'confirmation_required' | 'error';
  errorCode?: string;
  message: string;
  suggestions: string[];
  actions: { name: string; description?: string; ok: boolean; status: number; result: unknown }[];
  approval?: { id: string; actions: { name: string; description: string; args: Record<string, unknown> }[] };
}
