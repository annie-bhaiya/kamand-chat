'use client';

import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { ALL_CAMPUS_ROOMS } from '@/lib/campus-rooms';
import { CampusTicket } from '@/types/chat';
import {
ChevronUp,
MapPin,
Plus
} from 'lucide-react';
import React,{ useEffect,useEffectEvent,useRef,useState } from 'react';

interface CampusTicketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScope?: 'hostel' | 'mess';
  defaultClusterOrMess?: string;
  isAdmin?: boolean;
}

export const CampusTicketDrawer: React.FC<CampusTicketDrawerProps> = ({
  isOpen,
  onClose,
  defaultScope = 'hostel',
  defaultClusterOrMess = '',
}) => {
  const { error, success } = useToast();
  const { user, profile } = useAuth();

  const [tickets, setTickets] = useState<CampusTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const loadGeneration = useRef(0);
  const [activeScope, setActiveScope] = useState<'all' | 'hostel' | 'mess'>('all');
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'hostel' | 'mess'>(defaultScope);
  const [category, setCategory] = useState('Wi-Fi Dropouts');
  const [campus, setCampus] = useState<'North' | 'South'>('North');
  const initialRoom = ALL_CAMPUS_ROOMS.find(room => room.slug === defaultClusterOrMess || room.name === defaultClusterOrMess || room.hostelCluster === defaultClusterOrMess);
  const [clusterOrMess, setClusterOrMess] = useState((initialRoom?.hostelCluster || initialRoom?.name.replace(/\s*\(.*/, '')) || (defaultScope === 'hostel' ? profile?.hostel : profile?.mess) || '');
  const [statusFilter, setStatusFilter] = useState('');
  const scopeOptions = Array.from(new Set(ALL_CAMPUS_ROOMS.filter(room => room.category === (scope === 'hostel' ? 'hostels' : 'messes')).map(room => room.hostelCluster || room.name.replace(/\s*\(.*/, ''))));
  const [specificLocation, setSpecificLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);




  const loadTickets = async (showLoading = true) => {
    const generation = ++loadGeneration.current;
    if (showLoading) setLoading(true);
    try {
      const s = activeScope === 'all' ? undefined : activeScope;
      const res = await api.getCampusTickets({ scope: s, status: statusFilter || undefined, cluster: defaultClusterOrMess || undefined });
      if (generation !== loadGeneration.current) return;
        setTickets(res.data || []);
    } catch (err: unknown) {
      if (generation !== loadGeneration.current) return;
      error((err instanceof Error ? err.message : '') || 'Failed to load tickets.');
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  };
  const loadOnOpen = useEffectEvent(() => loadTickets());
  const refresh = useEffectEvent(() => loadTickets(false));
  useEffect(() => {
    if (!isOpen) return;
    const off = socketManager.on<{ kind: string }>('campus:changed', payload => { if (payload.kind === 'tickets') void refresh(); });
    const connected = socketManager.on<{ connected: boolean }>('connection:status', payload => { if (payload.connected) void refresh(); });
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    const timer = window.setInterval(focus, 30000);
    return () => { off(); connected(); window.removeEventListener('focus', focus); window.clearInterval(timer); };
  }, [isOpen]);
  // Fetch state follows the external request lifecycle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isOpen) loadOnOpen(); return () => { loadGeneration.current += 1; }; }, [isOpen, activeScope, defaultClusterOrMess, statusFilter]);

  const handleUpvote = async (ticketId: string) => {
    setBusyIds(ids => new Set(ids).add(ticketId));
    try {
      const res = await api.upvoteCampusTicket(ticketId);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? res.data.ticket : t)).sort((a, b) => b.upvotes - a.upvotes)
      );
      if (res.data.hasUpvoted) {
        success('Your support was added to this report.');
      }
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to register upvote.');
    } finally { setBusyIds(ids => { const next = new Set(ids); next.delete(ticketId); return next; }); }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !specificLocation.trim()) {
      error('Please provide a title and specific room/table location.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createCampusTicket({
        title: title.trim(),
        description: description.trim(),
        scope,
        category,
        campus,
        clusterOrMess,
        specificLocation: specificLocation.trim(),
      });

      success('Ticket logged! Wing residents can now upvote to escalate priority.');
      setShowSubmitForm(false);
      setTitle('');
      setDescription('');
      setSpecificLocation('');
      loadTickets();
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Ticket submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    setBusyIds(ids => new Set(ids).add(ticketId));
    try {
      const res = await api.updateCampusTicketStatus(ticketId, newStatus);
      if (res.data) {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? res.data : t)));
        success(`Ticket status updated to "${newStatus}"`);
      }
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to update ticket status.');
    } finally { setBusyIds(ids => { const next = new Set(ids); next.delete(ticketId); return next; }); }
  };

  if (!isOpen) return null;

  return <Modal isOpen={isOpen} onClose={onClose} title="Campus maintenance" description="Report an issue, follow its progress, and support reports that affect you." maxWidth={840}>
    <div className="campus-tool maintenance-workspace">
      <p className="campus-demo-notice">Reports are shared with your hostel or mess. Assigned caretakers and managers can update their progress.</p>
      <div className="campus-toolbar ticket-toolbar">
        <label>Status<select className="input-control" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">All statuses</option>{['Reported', 'Under Investigation', 'Resolved by Warden/Caretaker'].map(status => <option key={status}>{status}</option>)}</select></label>
        <div className="campus-tabs" aria-label="Issue scope">{(['all', 'hostel', 'mess'] as const).map(value => <button key={value} className="btn btn-ghost" aria-pressed={activeScope === value} onClick={() => setActiveScope(value)}>{value === 'all' ? 'All issues' : value === 'hostel' ? 'Hostels' : 'Messes'}</button>)}</div>
        <button className="btn btn-filled" data-tone="maintenance" onClick={() => setShowSubmitForm(value => !value)}><Plus size={16}/>{showSubmitForm ? 'Close form' : 'Report an issue'}</button>
      </div>
      {showSubmitForm && <form onSubmit={handleSubmitTicket} className="campus-form ticket-form">
        <h4>Report an issue</h4>
        <label>Title<input className="input-control" required minLength={5} maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs attention?"/></label>
        <label>Description<textarea className="input-control" value={description} onChange={e => setDescription(e.target.value)} rows={3}/></label>
        <div className="campus-form-grid">
          <label>Location type<select className="input-control" value={scope} onChange={e => { const next = e.target.value as 'hostel' | 'mess'; setScope(next); setClusterOrMess((next === 'hostel' ? profile?.hostel : profile?.mess) || ''); }}><option value="hostel">Hostel</option><option value="mess">Mess</option></select></label>
          <label>Campus<select className="input-control" value={campus} onChange={e => setCampus(e.target.value as 'North' | 'South')}><option>North</option><option>South</option></select></label>
          <label>Hostel or mess<select className="input-control" required value={clusterOrMess} onChange={e => setClusterOrMess(e.target.value)}><option value="">Choose a hostel or mess</option>{scopeOptions.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Specific location<input className="input-control" required minLength={2} value={specificLocation} onChange={e => setSpecificLocation(e.target.value)} placeholder="Block, room or table"/></label>
          <label>Category<select className="input-control" value={category} onChange={e => setCategory(e.target.value)}>{['Wi-Fi Dropouts', 'Electrical', 'Plumbing', 'Geyser', 'Food Quality', 'Hygiene', 'Other'].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <div className="ticket-form-actions"><button className="btn btn-filled" data-tone="maintenance" disabled={submitting} type="submit">{submitting ? 'Saving…' : 'Save report'}</button></div>
      </form>}
      {loading ? <p className="campus-state" role="status">Loading reports…</p> : !tickets.length ? <p className="campus-state">No issues in this view.</p> : <div className="campus-records">{tickets.map(ticket => <article key={ticket.id} className="campus-record campus-ticket">
        <button className="ticket-vote" disabled={busyIds.has(ticket.id)} aria-pressed={ticket.upvotedBy.includes(user?.id || '')} onClick={() => handleUpvote(ticket.id)} aria-label={`Support ${ticket.title}, ${ticket.upvotes} votes`}><ChevronUp size={18}/><strong>{ticket.upvotes}</strong><span>votes</span></button>
        <div className="campus-record-body">
          <div className="campus-record-meta"><span>{ticket.category}</span><span className="campus-status" data-status={ticket.status}>{ticket.status}</span></div>
          <h4>{ticket.title}</h4><p>{ticket.description}</p>
          <p className="campus-record-meta"><MapPin size={14}/>{ticket.clusterOrMess} · {ticket.specificLocation} · {ticket.campus}</p>
          <small>Reported by {ticket.creatorName}</small>
          {ticket.canManage && <label className="campus-status-control">Status<select className="input-control" value={ticket.status} disabled={busyIds.has(ticket.id)} onChange={e => handleUpdateStatus(ticket.id, e.target.value)}>{['Reported', 'Under Investigation', 'Resolved by Warden/Caretaker'].map(value => <option key={value}>{value}</option>)}</select></label>}
          {!!ticket.history?.length && <details><summary>Status history</summary><ol>{ticket.history.map((entry, index) => <li key={`${entry.createdAt}-${index}`}>{entry.status} · {new Date(entry.createdAt).toLocaleString('en-IN')}</li>)}</ol></details>}
        </div>
      </article>)}</div>}
    </div>
  </Modal>;
};
