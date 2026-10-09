'use client';

import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { messRoomSlug } from '@/lib/residence';
import { MessDayMenu } from '@/types/chat';
import { useCampusPermissions } from './useCampusPermissions';
import {
AlertCircle,
Calculator,
Calendar,
Coffee,
ChevronDown,
Moon,
Sun,
UtensilsCrossed,
Wrench
} from 'lucide-react';
import React,{ useEffect,useEffectEvent,useRef,useState } from 'react';

interface MessMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMessSlug?: string;
  onOpenTickets?: (messName: string) => void;
}

const MESSES = [
  { slug: 'pine-mess', name: 'Pine Mess', campus: 'North Campus', location: 'Near Alders (NDH 1)' },
  { slug: 'oak-mess', name: 'Oak Mess', campus: 'North Campus', location: 'North Dining Hall 2' },
  { slug: 'alder-mess', name: 'Alder Mess', campus: 'North Campus', location: 'Alder Hostel Cluster' },
  { slug: 'cedar-mess', name: 'Cedar Mess', campus: 'North Campus', location: 'Cedar Block Complex' },
  { slug: 'maple-mess', name: 'Maple Mess', campus: 'South Campus', location: 'South Dining Hall' },
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const todayInIndia = () => WEEKDAYS.indexOf(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' }).format(new Date())) + 1;


export const MessMenuDrawer: React.FC<MessMenuDrawerProps> = ({
  isOpen,
  onClose,
  defaultMessSlug = 'pine-mess',
  onOpenTickets,
}) => {
  const { error, success } = useToast();
  const initialMessSlug = messRoomSlug(defaultMessSlug);
  const [selectedMess, setSelectedMess] = useState<string>(initialMessSlug);
  const [selectedDay, setSelectedDay] = useState<number | undefined>();
  const [menuError, setMenuError] = useState('');
  const [menu, setMenu] = useState<MessDayMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const permissions = useCampusPermissions(selectedMess);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MessDayMenu | null>(null);
  const [saving, setSaving] = useState(false);
  const loadGeneration = useRef(0);
  const [activeTab, setActiveTab] = useState<'menu' | 'rebate'>('menu');

  // Rebate Form
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('Home Visit');
  const [rebateSubmitting, setRebateSubmitting] = useState(false);
  const [submittedRebates, setSubmittedRebates] = useState<
    Array<{ id: string; start: string; end: string; days: number; reason: string; status: string }>
  >([]);







  const loadMenu = async (slug: string, weekday?: number) => {
    setEditing(false);
    const generation = ++loadGeneration.current;
    setLoading(true);
    setMenu(null);
    setMenuError('');
    try {
      const res = await api.getMessMenu(slug, weekday);
      if (res.data) {
        if (generation !== loadGeneration.current) return;
        setMenu(res.data);
      }
    } catch (err: unknown) {
      if (generation !== loadGeneration.current) return;
      console.error('Failed to load menu:', err);
      setMenuError(err instanceof Error ? err.message : 'Could not fetch mess menu');
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  };
  const loadOnOpen = useEffectEvent(() => loadMenu(selectedMess, selectedDay));
  // Every new visit starts with the current mess and today's schedule.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isOpen) { setSelectedDay(undefined); setSelectedMess(initialMessSlug); setActiveTab('menu'); } }, [isOpen, initialMessSlug]);
  // Fetch state follows the external request lifecycle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isOpen) loadOnOpen(); return () => { loadGeneration.current += 1; }; }, [isOpen, selectedMess, selectedDay]);

  const calculateRebateDays = () => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffTime = e.getTime() - s.getTime();
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleApplyRebate = (e: React.FormEvent) => {
    e.preventDefault();
    const days = calculateRebateDays();
    if (days < 3) {
      error('Minimum 3 consecutive days are required to qualify for mess rebate.');
      return;
    }

    setRebateSubmitting(true);
    {
      setSubmittedRebates((prev) => [
        {
          id: `reb-${Date.now()}`,
          start: startDate,
          end: endDate,
          days,
          reason,
          status: 'Local draft — not submitted',
        },
        ...prev,
      ]);
      setRebateSubmitting(false);
      setStartDate('');
      setEndDate('');
      success('Draft saved for this visit. Submit your request through the official mess office.');
    }
  };

  if (!isOpen) return null;

  const currentMessObj = MESSES.find((m) => m.slug === selectedMess) || MESSES[0];
  const today = menu?.todayWeekday ?? todayInIndia();
  const shownDay = selectedDay ?? today;
  const isToday = shownDay === today;

  const meals = [
    { key: 'breakfast', name: 'Breakfast', time: '7:30 AM – 9:30 AM', Icon: Coffee },
    { key: 'lunch', name: 'Lunch', time: '12:30 PM – 2:30 PM', Icon: Sun },
    { key: 'dinner', name: 'Dinner', time: '7:30 PM – 9:30 PM', Icon: Moon },
  ] as const;

  return <Modal isOpen={isOpen} onClose={onClose} title="Mess Menu & Rebate" description={`${currentMessObj.name} · ${currentMessObj.campus} · ${currentMessObj.location}`} maxWidth={760} footer={<div className="dining-footer"><span>Dining planner</span><span>Rebate drafts are saved for this visit only</span></div>}>
    <div className="campus-tool dining-workspace" data-tone="dining">
      <div className="dining-toolbar">
        <label htmlFor="mess-select">Dining Hall:<select id="mess-select" className="input-control" value={selectedMess} disabled={saving} onChange={event => setSelectedMess(event.target.value)}>{MESSES.map(mess => <option key={mess.slug} value={mess.slug}>{mess.name} ({mess.campus})</option>)}</select></label>
        <div className="campus-tabs dining-tabs" aria-label="Dining view">
          <button className="btn btn-ghost" aria-pressed={activeTab === 'menu'} onClick={() => setActiveTab('menu')}><UtensilsCrossed size={16} />Menu</button>
          <button className="btn btn-ghost" aria-pressed={activeTab === 'rebate'} onClick={() => setActiveTab('rebate')}><Calculator size={16} />Rebate draft</button>
        </div>
      </div>
      {activeTab === 'menu' ? <>
        <div className="dining-day-row">
          <div className="dining-day"><h4>{isToday ? 'Today' : WEEKDAYS[shownDay - 1]}{isToday && ` · ${WEEKDAYS[shownDay - 1]}`}</h4><p>{isToday ? 'Today’s breakfast, lunch and dinner.' : 'Recurring weekly menu. Changes may be announced by your mess.'}</p></div>
          <div className="dining-day-controls"><label htmlFor="menu-day">View day<select id="menu-day" className="input-control" value={selectedDay ?? 'today'} disabled={saving} onChange={event => setSelectedDay(event.target.value === 'today' ? undefined : Number(event.target.value))}><option value="today">Today · {WEEKDAYS[today - 1]}</option>{WEEKDAYS.map((day, i) => <option key={day} value={i + 1}>{day}</option>)}</select></label>{selectedDay !== undefined && <button className="btn btn-ghost" disabled={saving} onClick={() => setSelectedDay(undefined)}>Back to today</button>}</div>
        </div>
        {loading ? <p className="campus-state" role="status">Fetching {WEEKDAYS[shownDay - 1]}’s menu...</p> : !menu ? <div className="campus-state" role="status"><p>{menuError === 'No menu has been published for this day.' ? menuError : 'The menu could not be loaded. Please try again.'}</p><button className="btn btn-tonal" onClick={() => loadMenu(selectedMess, selectedDay)}>Retry</button></div> : <div className="dining-meals" aria-live="polite">{meals.map(({ key, name, time, Icon }) => <section key={key} className="dining-meal"><div className="dining-meal-label"><Icon size={20} aria-hidden="true" /><div><h4>{name}</h4><small>{time}</small></div></div><p>{menu[key] || 'No menu information available.'}</p></section>)}</div>}
        {menu?.specialNotice && <details key={`${selectedMess}-${shownDay}`} className="dining-menu-notes"><summary><span>Serving notes and menu options</span><ChevronDown size={18} aria-hidden="true" /></summary><ul>{menu.specialNotice.split(/\n+/).map(note => note.trim()).filter(Boolean).map((note, index) => <li key={index}>{note}</li>)}</ul></details>}
        {permissions?.canUpdateMenu && menu && <section>
          {!editing ? <button type="button" className="btn btn-tonal" data-tone="dining" onClick={() => { setDraft({ ...menu }); setEditing(true); }}>Edit {WEEKDAYS[shownDay - 1]}’s menu</button> : draft && <form className="campus-form" onSubmit={async event => {
            event.preventDefault(); setSaving(true);
            try {
              const input = { weekday: draft.weekday, breakfast: draft.breakfast, lunch: draft.lunch, dinner: draft.dinner, specialNotice: draft.specialNotice };
              const response = await api.request<MessDayMenu>(`/api/campus/messes/${selectedMess}/menu`, { method: 'PUT', body: JSON.stringify(input) });
              setMenu(response.data); setEditing(false); success(`${WEEKDAYS[draft.weekday - 1]}’s menu saved`);
            } catch (err) { error(err instanceof Error ? err.message : 'Could not save menu'); }
            finally { setSaving(false); }
          }}>
            <h4>Edit {WEEKDAYS[draft.weekday - 1]}’s recurring menu</h4>
            {(['breakfast', 'lunch', 'dinner', 'specialNotice'] as const).map(field => <label key={field}>{field === 'specialNotice' ? 'Serving notes and menu options' : field.charAt(0).toUpperCase() + field.slice(1)}<textarea className="input-control" value={draft[field] || ''} required={field !== 'specialNotice'} maxLength={2000} disabled={saving} rows={3} onChange={event => setDraft({ ...draft, [field]: event.target.value })} /></label>)}
            <div className="dining-actions"><button className="btn btn-filled" data-tone="dining" disabled={saving}>{saving ? 'Saving…' : 'Save menu'}</button><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setEditing(false)}>Cancel</button></div>
          </form>}
        </section>}
        <div className="dining-support"><div><h4>Food quality or menu shortage?</h4><p>Report an issue to your mess’s assigned managers.</p></div>{onOpenTickets && <button className="btn btn-tonal" data-tone="maintenance" onClick={() => onOpenTickets(currentMessObj.name)}><Wrench size={16} />Report Mess Issue</button>}</div>
      </> : <>
        <div className="dining-guidance"><h4><AlertCircle size={18} aria-hidden="true" />Sample rebate guidance · Confirm with the mess office</h4><ul><li>Minimum rebate duration is <strong>3 consecutive days</strong>.</li><li>Applications must be submitted at least <strong>48 hours in advance</strong>.</li><li>Rebate amount is calculated @ ₹140/day and credited directly to the next semester mess billing ledger.</li></ul></div>
        <form className="campus-form" onSubmit={handleApplyRebate}><h4><Calendar size={18} aria-hidden="true" />Plan a rebate request</h4><p className="field-help">This saves a local draft. Submit your request through the official mess office.</p>
          <div className="campus-form-grid"><label htmlFor="rebate-from-date">From Date<input id="rebate-from-date" className="input-control" type="date" required value={startDate} onChange={event => setStartDate(event.target.value)} /></label><label htmlFor="rebate-to-date">To Date<input id="rebate-to-date" className="input-control" type="date" min={startDate || undefined} required value={endDate} onChange={event => setEndDate(event.target.value)} /></label></div>
          <label htmlFor="rebate-reason">Reason for Leave<select id="rebate-reason" className="input-control" value={reason} onChange={event => setReason(event.target.value)}><option value="Home Visit">Home Visit / Personal Leave</option><option value="Academic Conference / Fest">Academic Conference / Inter-IIT Fest</option><option value="Medical Leave">Medical Leave (Approved by Medical Officer)</option><option value="Internship / Project Work">Official Internship / Project Work</option></select></label>
          {calculateRebateDays() > 0 && <div className="dining-estimate"><span>Total Duration: <strong>{calculateRebateDays()} days</strong></span><span>Est. Credit: <strong>₹{calculateRebateDays() * 140}</strong></span></div>}
          <button className="btn btn-filled" data-tone="dining" disabled={rebateSubmitting}>{rebateSubmitting ? 'Saving…' : 'Save rebate draft'}</button>
        </form>
        {!!submittedRebates.length && <section className="dining-drafts"><h4>Your Recent Rebates</h4>{submittedRebates.map(rebate => <article key={rebate.id}><div><strong>{rebate.reason} · {rebate.days} days</strong><p>{rebate.start} → {rebate.end}</p></div><span>{rebate.status}</span></article>)}</section>}
      </>}
    </div>
  </Modal>;
};
