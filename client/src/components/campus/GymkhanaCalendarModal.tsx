'use client';

import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';
import { ALL_CAMPUS_ROOMS } from '@/lib/campus-rooms';
import { CampusEvent } from '@/types/chat';
import {
Calendar as CalendarIcon,
Clock,
MapPin,
Plus
} from 'lucide-react';
import React,{ useEffect,useEffectEvent,useRef,useState } from 'react';
import { useCampusPermissions } from './useCampusPermissions';

interface GymkhanaCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrganizer?: string;
  isAdmin?: boolean;
}

const VENUES = [
  'All Venues',
  'Auditorium A1/A2',
  'A13 Hall',
  'South Campus Grounds',
  'SCEE Seminar Hall',
  'Sports Complex',
] as const;

const CATEGORIES = [
  'All Categories',
  'Club Workshop',
  'Fest Event',
  'Sports Tournament',
  'Placement & Tech Talk',
  'General',
] as const;

export const GymkhanaCalendarModal: React.FC<GymkhanaCalendarModalProps> = ({
  isOpen,
  onClose,
  defaultOrganizer,
}) => {
  const { error, success } = useToast();
  const { user } = useAuth();

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const loadGeneration = useRef(0);
  const [selectedVenue, setSelectedVenue] = useState<string>('All Venues');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [changingId, setChangingId] = useState<string | null>(null);

  const room = ALL_CAMPUS_ROOMS.find(room => room.name === defaultOrganizer || room.slug === defaultOrganizer) || ALL_CAMPUS_ROOMS.find(room => user?.app_metadata?.campus_rooms?.includes(room.slug));

  // Booking Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CampusEvent['category']>('Club Workshop');
  const [organizer, setOrganizer] = useState(room?.name || defaultOrganizer || 'KamandPrompt');
  const organizerRoom = ALL_CAMPUS_ROOMS.find(room => room.name === organizer || room.slug === organizer);
  const permissions = useCampusPermissions(organizerRoom?.slug);
  const canBook = !!permissions?.canBookEvents;
  const [venue, setVenue] = useState<CampusEvent['venue']>('Auditorium A1/A2');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('17:30');
  const [endTime, setEndTime] = useState('20:30');
  const [submitting, setSubmitting] = useState(false);




  const loadEvents = async (showLoading = true) => {
    const generation = ++loadGeneration.current;
    if (showLoading) setLoading(true);
    try {
      const v = selectedVenue === 'All Venues' ? undefined : selectedVenue;
      const c = selectedCategory === 'All Categories' ? undefined : selectedCategory;
      const res = await api.getCampusEvents(v, c);
      if (generation !== loadGeneration.current) return;
        setEvents(res.data || []);
    } catch (err: unknown) {
      if (generation !== loadGeneration.current) return;
      error((err instanceof Error ? err.message : '') || 'Failed to load Gymkhana calendar events.');
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  };
  const loadOnOpen = useEffectEvent(() => loadEvents());
  const refresh = useEffectEvent(() => loadEvents(false));
  useEffect(() => {
    if (!isOpen) return;
    const off = socketManager.on<{ kind: string }>('campus:changed', payload => { if (payload.kind === 'events') void refresh(); });
    const connected = socketManager.on<{ connected: boolean }>('connection:status', payload => { if (payload.connected) void refresh(); });
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    const timer = window.setInterval(focus, 30000);
    return () => { off(); connected(); window.removeEventListener('focus', focus); window.clearInterval(timer); };
  }, [isOpen]);
  // Fetch state follows the external request lifecycle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isOpen) loadOnOpen(); return () => { loadGeneration.current += 1; }; }, [isOpen, selectedVenue, selectedCategory]);

  const handleBookEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !organizer.trim() || !date) {
      error('Please fill in event title, organizer, and date.');
      return;
    }

    setSubmitting(true);
    try {
      const input = {
        title: title.trim(),
        description: description.trim(),
        category,
        organizer: organizer.trim(),
        venue,
        date,
        startTime,
        endTime,
      };
      const res = editingId ? await api.updateCampusEvent(editingId, input) : await api.createCampusEvent(input);

      if ('warning' in res && typeof res.warning === 'string') {
        error(res.warning);
      } else {
        success(`Event "${title}" proposed and scheduled at ${venue}!`);
      }

      setShowBookingForm(false);
      setEditingId(null);
      setTitle('');
      setDescription('');
      loadEvents();
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Booking submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (event: CampusEvent, status: string) => {
    setChangingId(event.id);
    try {
      const response = await api.updateCampusEventStatus(event.id, status);
      setEvents(items => items.map(item => item.id === event.id ? response.data : item));
      if (status === 'approved' && response.data.status === 'conflict') error('Another event occupies this venue. Reschedule before approving.');
      else success('Event status saved');
    } catch (err) { error(err instanceof Error ? err.message : 'Could not update event'); }
    finally { setChangingId(null); }
  };
  const editEvent = (event: CampusEvent) => {
    setEditingId(event.id); setTitle(event.title); setDescription(event.description); setOrganizer(event.organizer);
    setCategory(event.category); setVenue(event.venue); setDate(event.date); setStartTime(event.startTime); setEndTime(event.endTime); setShowBookingForm(true);
  };

  if (!isOpen) return null;

  return <Modal isOpen={isOpen} onClose={onClose} title="Campus calendar" description="Find workshops, matches, and plans around campus." maxWidth={840}>
    <div className="campus-tool">
      <p className="campus-demo-notice">Plan campus events, check venue availability, and follow organizer updates.</p>
      <div className="campus-toolbar">
        <label>Venue<select className="input-control" value={selectedVenue} onChange={e => setSelectedVenue(e.target.value)}>{VENUES.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Event type<select className="input-control" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></label>
        {(canBook || user?.app_metadata?.campus_rooms?.length) && <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowBookingForm(value => !value); }}><Plus size={16}/>{showBookingForm ? 'Close form' : 'Plan an event'}</button>}
      </div>
      {showBookingForm && <form className="campus-form" onSubmit={handleBookEvent}>
        <h4>{editingId ? 'Edit or reschedule event' : 'Plan an event'}</h4>
        <label>Event title<input className="input-control" required minLength={3} maxLength={120} value={title} onChange={e => setTitle(e.target.value)}/></label>
        <label>Description<textarea className="input-control" rows={3} value={description} onChange={e => setDescription(e.target.value)}/></label>
        <div className="campus-form-grid">
          <label>Organizer<select className="input-control" required value={organizer} onChange={e => setOrganizer(e.target.value)}>{ALL_CAMPUS_ROOMS.map(room => <option key={room.slug} value={room.name}>{room.name}</option>)}</select></label>
          <label>Event type<select className="input-control" value={category} onChange={e => setCategory(e.target.value as CampusEvent['category'])}>{CATEGORIES.slice(1).map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Venue<select className="input-control" value={venue} onChange={e => setVenue(e.target.value as CampusEvent['venue'])}>{[...VENUES.slice(1), 'Other'].map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Date<input className="input-control" type="date" required value={date} onChange={e => setDate(e.target.value)}/></label>
          <label>Starts at<input className="input-control" type="time" required value={startTime} onChange={e => setStartTime(e.target.value)}/></label>
          <label>Ends at<input className="input-control" type="time" required value={endTime} onChange={e => setEndTime(e.target.value)}/></label>
        </div>
        {!canBook && <p>Choose an organizer whose events you manage.</p>}
        <button className="btn btn-primary" disabled={submitting || !canBook} type="submit">{submitting ? 'Saving…' : 'Save event'}</button>
      </form>}
      {loading ? <p className="campus-state" role="status">Loading events…</p> : !events.length ? <p className="campus-state">No events match these filters.</p> : <div className="campus-records">{events.map(event => <article className="campus-record" key={event.id}>
        <div className="campus-record-meta"><span>{event.category}</span><span className="campus-status">{event.status === 'approved' ? 'Scheduled' : event.status}</span></div>
        <h4>{event.title}</h4><p>{event.description}</p>
        <div className="campus-record-meta"><CalendarIcon size={15}/><time dateTime={event.date}>{new Date(`${event.date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' })}</time><Clock size={15}/>{event.startTime} – {event.endTime}</div>
        <div className="campus-record-meta"><MapPin size={15}/>{event.venue} · {event.organizer}</div>
        {event.canManage && <div className="campus-toolbar"><button type="button" className="btn btn-secondary" disabled={submitting} onClick={() => editEvent(event)}>Edit or reschedule</button><label>Status<select className="input-control" value={event.status} disabled={changingId !== null} onChange={e => changeStatus(event, e.target.value)}>{['pending', 'approved', 'conflict', 'completed', 'cancelled'].map(status => <option key={status} value={status}>{status === 'approved' ? 'Scheduled' : status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select></label></div>}
      </article>)}</div>}
    </div>
  </Modal>;
};
