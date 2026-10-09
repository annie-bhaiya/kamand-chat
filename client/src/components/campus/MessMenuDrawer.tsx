'use client';

import { useToast } from '@/components/ui/Toast';
import { useDialogFocus } from '@/components/ui/useDialogFocus';
import { api } from '@/lib/api';
import { MessDayMenu } from '@/types/chat';
import { useCampusPermissions } from './useCampusPermissions';
import {
AlertCircle,
Calculator,
Calendar,
Coffee,
MapPin,
Moon,
Sun,
Sunset,
UtensilsCrossed,
Wrench,
X
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


export const MessMenuDrawer: React.FC<MessMenuDrawerProps> = ({
  isOpen,
  onClose,
  defaultMessSlug = 'pine-mess',
  onOpenTickets,
}) => {
  const dialogRef = useDialogFocus(isOpen, onClose);
  const { error, success } = useToast();
  const [selectedMess, setSelectedMess] = useState<string>(defaultMessSlug);
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







  const loadMenu = async (slug: string) => {
    setEditing(false);
    const generation = ++loadGeneration.current;
    setLoading(true);
    setMenu(null);
    try {
      const res = await api.getMessMenu(slug);
      if (res.data) {
        if (generation !== loadGeneration.current) return;
        setMenu(res.data);
      }
    } catch (err: unknown) {
      if (generation !== loadGeneration.current) return;
      console.error('Failed to load menu:', err);
      error((err instanceof Error ? err.message : '') || 'Could not fetch mess menu');
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  };
  const loadOnOpen = useEffectEvent(() => loadMenu(selectedMess));
  // Fetch state follows the external request lifecycle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (isOpen) loadOnOpen(); return () => { loadGeneration.current += 1; }; }, [isOpen, selectedMess]);

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

  return (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Mess menu and rebate draft" onClick={e => { if (e.target === e.currentTarget) onClose(); }} className="campus-dialog fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl h-full bg-[var(--bg-secondary)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col transform transition-transform duration-300">
        <p className="campus-demo-notice">Sample menu · Confirm today’s meals with your mess. Rebate drafts are not submitted.</p>
        {/* Drawer Header */}
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-[var(--accent)] border border-amber-500/20 shadow-inner">
              <UtensilsCrossed size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Mess Menu &amp; Rebate</h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-[var(--accent)] border border-amber-500/20 rounded">
                  {currentMessObj.campus}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                <MapPin size={12} className="text-[var(--accent)]/80" />
                {currentMessObj.name} &bull; {currentMessObj.location}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
            aria-label="Close dialog"
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Mess Selector & Navigation Bar */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="mess-select" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Dining Hall:
              </label>
              <select
                id="mess-select"
                value={selectedMess}
                onChange={(e) => setSelectedMess(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500"
              >
                {MESSES.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name} ({m.campus})
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-tabs: Menu vs Rebates */}
            <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)] text-xs">
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'menu'
                    ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <UtensilsCrossed size={12} /> Today&apos;s Menu
              </button>
              <button
                onClick={() => setActiveTab('rebate')}
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === 'rebate'
                    ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Calculator size={12} /> Rebate draft
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Menu View */}
        {activeTab === 'menu' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <p className="campus-menu-date">{menu?.day || "Sample daily menu"}</p>

            {/* Menu Sections */}
            <div className="p-6 space-y-4 flex-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-[var(--text-secondary)] gap-3">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm">Fetching daily dining schedule...</p>
                </div>
              ) : !menu ? <p className="campus-state">The menu could not be loaded. Choose a mess again to retry.</p> : (
                <div className="grid grid-cols-1 gap-4">
                  {/* Breakfast */}
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4.5 hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-orange-500/10 text-[var(--accent)]">
                          <Coffee size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">Breakfast</h4>
                          <span className="text-[11px] text-[var(--text-secondary)]">7:30 AM &ndash; 9:30 AM</span>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--text-secondary)]">Morning</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                      {menu?.breakfast || 'Idli, Sambhar, Coconut Chutney, Bread Butter, Sprouts, Milk / Tea'}
                    </p>
                  </div>

                  {/* Lunch */}
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4.5 hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                          <Sun size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">Lunch</h4>
                          <span className="text-[11px] text-[var(--text-secondary)]">12:30 PM &ndash; 2:30 PM</span>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--text-secondary)]">Afternoon</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                      {menu?.lunch || 'Rajma Masala, Steamed Jeera Rice, Phulka, Boondi Raita, Green Salad'}
                    </p>
                  </div>

                  {/* Evening Snacks */}
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4.5 hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-[var(--accent)]">
                          <Sunset size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">Evening Snacks</h4>
                          <span className="text-[11px] text-[var(--text-secondary)]">5:00 PM &ndash; 6:00 PM</span>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--text-secondary)]">Evening</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                      {menu?.snacks || 'Hot Samosa with Mint Chutney, Biscuits, Hot Tea / Coffee'}
                    </p>
                  </div>

                  {/* Dinner */}
                  <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-4.5 hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-subtle)]">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-[var(--accent)]">
                          <Moon size={18} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">Dinner</h4>
                          <span className="text-[11px] text-[var(--text-secondary)]">7:30 PM &ndash; 9:30 PM</span>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--text-secondary)]">Night</span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                      {menu?.dinner || 'Paneer Butter Masala, Dal Makhani, Tawa Roti, Rice, Gulab Jamun (Sweet)'}
                    </p>
                  </div>
                </div>
              )}

              {permissions?.canUpdateMenu && menu && <section>
                {!editing ? <button type="button" className="btn btn-secondary" onClick={() => { setDraft({ ...menu }); setEditing(true); }}>Edit menu and notice</button> : draft && <form className="campus-form" onSubmit={async event => {
                  event.preventDefault(); setSaving(true);
                  try {
                    const input = { day: draft.day, breakfast: draft.breakfast, lunch: draft.lunch, snacks: draft.snacks, dinner: draft.dinner, specialNotice: draft.specialNotice };
                    const response = await api.request<MessDayMenu>(`/api/campus/messes/${selectedMess}/menu`, { method: 'PUT', body: JSON.stringify(input) });
                    setMenu(response.data); setEditing(false); success('Mess menu saved');
                  } catch (err) { error(err instanceof Error ? err.message : 'Could not save menu'); }
                  finally { setSaving(false); }
                }}>
                  {(['day', 'breakfast', 'lunch', 'snacks', 'dinner', 'specialNotice'] as const).map(field => <label key={field} style={{ display: 'block', marginBottom: 12 }}>
                    {field === 'specialNotice' ? 'Special notice' : field.charAt(0).toUpperCase() + field.slice(1)}
                    <textarea className="input-control" value={draft[field] || ''} required={field !== 'specialNotice'} maxLength={field === 'day' ? 40 : 2000} disabled={saving} onChange={event => setDraft({ ...draft, [field]: event.target.value })} />
                  </label>)}
                  <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save menu'}</button><button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setEditing(false)}>Cancel</button></div>
                </form>}
              </section>}

              {/* Action row to file Mess Tickets */}
              <div className="pt-2">
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-[var(--text-primary)]">Notice an issue with food quality or menu shortage?</h5>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Create a demo report. Contact the mess office for official support.
                    </p>
                  </div>
                  {onOpenTickets && (
                    <button
                      onClick={() => onOpenTickets(currentMessObj.name)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] text-[var(--on-accent)] hover:bg-[var(--accent)] text-[var(--on-accent)] transition-all shadow-md whitespace-nowrap"
                    >
                      <Wrench size={12} />
                      Report Mess Issue
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Rebate View */}
        {activeTab === 'rebate' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Policy Info Card */}
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center gap-2 text-[var(--accent)] font-bold text-sm">
                <AlertCircle size={16} />
                <span>Sample rebate guidance · Confirm with the mess office</span>
              </div>
              <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                <li>Minimum rebate duration is <strong className="text-[var(--text-primary)]">3 consecutive days</strong>.</li>
                <li>Applications must be submitted at least <strong className="text-[var(--text-primary)]">48 hours in advance</strong>.</li>
                <li>Rebate amount is calculated @ ₹140/day and credited directly to the next semester mess billing ledger.</li>
              </ul>
            </div>

            {/* Application Form */}
            <form onSubmit={handleApplyRebate} className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Calendar size={16} className="text-[var(--accent)]" />
                Plan a rebate request
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rebate-from-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">From Date</label>
                  <input
                    id="rebate-from-date"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label htmlFor="rebate-to-date" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">To Date</label>
                  <input
                    id="rebate-to-date"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="rebate-reason" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Reason for Leave</label>
                <select
                  id="rebate-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500"
                >
                  <option value="Home Visit">Home Visit / Personal Leave</option>
                  <option value="Academic Conference / Fest">Academic Conference / Inter-IIT Fest</option>
                  <option value="Medical Leave">Medical Leave (Approved by Medical Officer)</option>
                  <option value="Internship / Project Work">Official Internship / Project Work</option>
                </select>
              </div>

              {calculateRebateDays() > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--accent)] flex items-center justify-between">
                  <span>Total Duration: <strong>{calculateRebateDays()} days</strong></span>
                  <span>Est. Credit: <strong>₹{calculateRebateDays() * 140}</strong></span>
                </div>
              )}

              <button
                type="submit"
                disabled={rebateSubmitting}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-[var(--text-primary)] text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {rebateSubmitting ? 'Submitting Application...' : 'Submit Rebate Request'}
              </button>
            </form>

            {/* Submitted Applications List */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Your Recent Rebates</h5>
              {submittedRebates.map((reb) => (
                <div
                  key={reb.id}
                  className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{reb.reason}</span>
                      <span className="text-[11px] text-[var(--accent)] font-mono">({reb.days} days)</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      {reb.start} &rarr; {reb.end}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-[var(--accent)] border border-emerald-500/20">
                    {reb.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Dining planner</span>
          <span className="text-[var(--accent)]/80 font-medium">Local draft only</span>
        </div>
      </div>
    </div>
  );
};
