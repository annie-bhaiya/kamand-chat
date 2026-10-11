'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Send, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { useDialogFocus } from '@/components/ui/useDialogFocus';
import type { AssistantReply } from '@/types/assistant';

export function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; reply?: AssistantReply }[]>([]);
  const [approval, setApproval] = useState<AssistantReply['approval']>();
  const [error, setError] = useState('');
  const { refreshProfile } = useAuth();
  const { activeConversationId, refreshConversations } = useChat();
  const endRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const panelRef = useDialogFocus(open, () => setOpen(false));
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages, busy]);

  async function send(message?: string, decision?: 'confirm' | 'cancel') {
    if (inFlight.current || (!message?.trim() && !decision)) return;
    inFlight.current = true;
    setBusy(true); setError('');
    if (message) { setMessages(previous => [...previous, { role: 'user', text: message }]); setDraft(''); }
    try {
      const response = await api.assistant({ sessionId, ...(decision ? { decision, approvalId: approval?.id } : { message }), conversationId: activeConversationId });
      const reply = response.data;
      setSessionId(reply.sessionId); setApproval(reply.approval);
      setMessages(previous => [...previous, { role: 'assistant', text: reply.message, reply }]);
      if (reply.actions.some(action => action.ok && !action.name.startsWith('get_'))) {
        await Promise.allSettled([refreshConversations(), refreshProfile()]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The assistant could not be reached.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <>
    <button className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Open Kamand assistant" aria-expanded={open}>
      <Bot size={20} /><span>Assistant</span>
    </button>

    {open && <div className="assistant-overlay" onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="assistant-panel" role="dialog" aria-modal="true" aria-labelledby="assistant-title" ref={panelRef} tabIndex={-1}>
        <header className="assistant-header">
          <div><h2 id="assistant-title">Kamand assistant</h2><p>Find answers. Get things done.</p></div>
          <button className="btn-icon btn-ghost" aria-label="Close assistant" onClick={() => setOpen(false)}><X size={20} /></button>
        </header>
        <div className="assistant-thread" aria-live="polite" aria-busy={busy}>
          {messages.length === 0 && <div className="assistant-welcome">
            <Bot size={30} /><h3>What can I help you do?</h3>
            <p>Search your chats, send a message, manage a group, check the mess menu or report a campus issue.</p>
            <p className="assistant-note">Requested actions appear for review before anything changes. Your requests and relevant app data are sent to Gemini.</p>
            {['What is on my mess menu today?', 'Show upcoming campus events', 'Help me report a hostel maintenance issue'].map(text => <button key={text} className="assistant-prompt" onClick={() => void send(text)} disabled={busy}>{text}</button>)}
          </div>}
          {messages.map((message, index) => <div key={index} className={`assistant-message assistant-message-${message.role}`}>
            <span className="assistant-speaker">{message.role === 'user' ? 'You' : 'Kamand assistant'}</span>
            <p>{message.text}</p>
            {message.reply?.actions.map((action, actionIndex) => <details className="assistant-result" key={actionIndex}>
              <summary>{action.ok ? 'Completed' : 'Failed'} · {action.description || action.name.replace(/_/g, ' ').trim()}</summary>
              <pre>{JSON.stringify(action.result, null, 2)}</pre>
            </details>)}
          </div>)}
          {busy && <p className="assistant-note" role="status">Working on your request…</p>}
          <div ref={endRef} />
        </div>
        {approval && <div className="assistant-approval">
          <h3>Review actions</h3>
          {approval.actions.map((action, index) => <details key={index} open><summary>{action.description}</summary><pre>{JSON.stringify(action.args, null, 2)}</pre></details>)}
          <div className="assistant-decisions"><button className="btn btn-primary" disabled={busy} onClick={() => void send(undefined, 'confirm')}><Check size={16} />Confirm actions</button><button className="btn btn-secondary" disabled={busy} onClick={() => void send(undefined, 'cancel')}>Cancel</button></div>
        </div>}
        {error && <p className="assistant-error" role="alert">{error} If the request was interrupted, check the app before repeating an action.</p>}
        {!approval && !busy && messages.at(-1)?.reply?.suggestions.map(text => <button className="assistant-followup" key={text} onClick={() => void send(text)}>{text}</button>)}
        <form className="assistant-composer" onSubmit={event => { event.preventDefault(); void send(draft.trim()); }}>
          <label className="sr-only" htmlFor="assistant-input">Your assistant request</label>
          <textarea id="assistant-input" placeholder={approval ? 'Confirm or cancel the actions above' : 'Ask Kamand assistant…'} value={draft} onChange={event => setDraft(event.target.value)} maxLength={6000} rows={2} disabled={busy || Boolean(approval)} />
          <button className="btn btn-primary" aria-label="Send assistant request" disabled={busy || Boolean(approval) || !draft.trim()}><Send size={18} /></button>
        </form>
        <button className="assistant-reset" disabled={busy} onClick={() => { setSessionId(undefined); setMessages([]); setApproval(undefined); setError(''); setDraft(''); }}>New assistant conversation</button>
      </div>
    </div>}
  </>;
}
