'use client';

import React, { useState, useEffect, useEffectEvent } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { CampusTicket } from '@/types/chat';
import {
  Wrench,
  ThumbsUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  X,
  MapPin,
  UtensilsCrossed,
  Wifi,
  Flame,
  Droplets,
  Layers,
  ChevronUp,
  Lock,
} from 'lucide-react';

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
  isAdmin,
}) => {
  const { error, success } = useToast();
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<CampusTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState<'all' | 'hostel' | 'mess'>('all');
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  const roll = profile?.username?.toLowerCase() || '';
  const isHostelMessAdmin =
    isAdmin !== undefined
      ? isAdmin
      : ['admin', 'gymkhana', 'warden', 'caretaker', 'b22001', 'b23419'].includes(roll) ||
        roll.includes('warden') ||
        roll.includes('caretaker');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<'hostel' | 'mess'>(defaultScope);
  const [category, setCategory] = useState('Wi-Fi Dropouts');
  const [campus, setCampus] = useState<'North' | 'South'>('North');
  const [clusterOrMess, setClusterOrMess] = useState(defaultClusterOrMess || 'Suraj Taal');
  const [specificLocation, setSpecificLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);




  const loadTickets = async () => {
    setLoading(true);
    try {
      const s = activeScope === 'all' ? undefined : activeScope;
      const res = await api.getCampusTickets({ scope: s });
      setTickets(res.data || []);
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  };
  const loadOnOpen = useEffectEvent(() => loadTickets());
  useEffect(() => { if (isOpen) loadOnOpen(); }, [isOpen, activeScope]);

  const handleUpvote = async (ticketId: string) => {
    try {
      const res = await api.upvoteCampusTicket(ticketId);
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? res.data.ticket : t)).sort((a, b) => b.upvotes - a.upvotes)
      );
      if (res.data.hasUpvoted) {
        success('Upvoted! Priority escalated for Warden & Caretaker dashboard.');
      }
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to register upvote.');
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !specificLocation.trim()) {
      error('Please provide a title and specific room/table location.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createCampusTicket({
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
    try {
      const res = await api.updateCampusTicketStatus(ticketId, newStatus);
      if (res.data) {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? res.data : t)));
        success(`Ticket status updated to "${newStatus}"`);
      }
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to update ticket status.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 15, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg), 0 0 60px rgba(16, 185, 129, 0.2)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--accent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Wrench size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Hostel & Mess Issue Tracker
                </h2>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Warden & Caretaker Queue
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Threaded issue tracking for Wi-Fi, geysers, plumbing, and mess quality with collective upvoting
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowSubmitForm(!showSubmitForm)}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.833rem', background: 'var(--accent)' }}
            >
              {showSubmitForm ? <X size={15} /> : <Plus size={15} />}
              <span>{showSubmitForm ? 'Close Form' : 'Log Fault / Complaint'}</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: '8px', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveScope('all')}
              className={`btn btn-ghost ${activeScope === 'all' ? 'active' : ''}`}
              style={{
                fontSize: '0.8rem',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: activeScope === 'all' ? 'var(--border-subtle)' : 'transparent',
                fontWeight: activeScope === 'all' ? 700 : 500,
              }}
            >
              All Campus Issues
            </button>
            <button
              onClick={() => setActiveScope('hostel')}
              className={`btn btn-ghost ${activeScope === 'hostel' ? 'active' : ''}`}
              style={{
                fontSize: '0.8rem',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: activeScope === 'hostel' ? 'var(--accent-light)' : 'transparent',
                color: activeScope === 'hostel' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeScope === 'hostel' ? 700 : 500,
              }}
            >
              🏢 Hostel Infrastructure
            </button>
            <button
              onClick={() => setActiveScope('mess')}
              className={`btn btn-ghost ${activeScope === 'mess' ? 'active' : ''}`}
              style={{
                fontSize: '0.8rem',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: activeScope === 'mess' ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                color: activeScope === 'mess' ? '#fbbf24' : 'var(--text-secondary)',
                fontWeight: activeScope === 'mess' ? 700 : 500,
              }}
            >
              🍽️ Mess & Food Quality
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Sorted by Upvotes (Aggregated Administrative Priority)
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Submit Ticket Form */}
          {showSubmitForm && (
            <form
              onSubmit={handleSubmitTicket}
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <h3 style={{ fontSize: '1.0rem', fontWeight: 700, color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Wrench size={16} /> Submit Maintenance or Mess Complaint
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Issue Scope</label>
                  <select
                    className="input-control"
                    value={scope}
                    onChange={(e) => setScope(e.target.value as 'hostel' | 'mess')}
                  >
                    <option value="hostel" style={{ background: '#0f172a' }}>Hostel Infrastructure</option>
                    <option value="mess" style={{ background: '#0f172a' }}>Mess & Dining Facility</option>
                  </select>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Fault Category</label>
                  <select
                    className="input-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {scope === 'hostel' ? (
                      <>
                        <option value="Wi-Fi Dropouts" style={{ background: '#0f172a' }}>Wi-Fi Dropouts / Network Loss</option>
                        <option value="Geyser Issues" style={{ background: '#0f172a' }}>Geyser / Water Heating Fault</option>
                        <option value="Plumbing" style={{ background: '#0f172a' }}>Plumbing / Drainage Leak</option>
                        <option value="Carpentry" style={{ background: '#0f172a' }}>Carpentry / Door / Window</option>
                        <option value="Cleanliness" style={{ background: '#0f172a' }}>Cleanliness & Washrooms</option>
                        <option value="Other" style={{ background: '#0f172a' }}>Other Infrastructure</option>
                      </>
                    ) : (
                      <>
                        <option value="Food Quality" style={{ background: '#0f172a' }}>Food Quality / Taste</option>
                        <option value="Shortage" style={{ background: '#0f172a' }}>Food Shortage Before Closing</option>
                        <option value="Menu Adjustment" style={{ background: '#0f172a' }}>Menu Adjustment Suggestion</option>
                        <option value="Hygiene" style={{ background: '#0f172a' }}>Dining Hygiene & Utensils</option>
                        <option value="Other" style={{ background: '#0f172a' }}>Other Mess Grievance</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Campus</label>
                  <select
                    className="input-control"
                    value={campus}
                    onChange={(e) => setCampus(e.target.value as 'North' | 'South')}
                  >
                    <option value="North" style={{ background: '#0f172a' }}>North Campus</option>
                    <option value="South" style={{ background: '#0f172a' }}>South Campus</option>
                  </select>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Cluster or Mess Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suraj Taal, Parashar, Oak Mess, Pine Mess"
                    className="input-control"
                    value={clusterOrMess}
                    onChange={(e) => setClusterOrMess(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Issue Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wi-Fi AP constantly rebooting in B18 corridor 2nd floor"
                  className="input-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Specific Room / Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B18 Room 214 or Pine Mess Table 6 Counter"
                  className="input-control"
                  value={specificLocation}
                  onChange={(e) => setSpecificLocation(e.target.value)}
                />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Detailed Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe when it happens, frequency, or impacts..."
                  className="input-control"
                  style={{ resize: 'vertical' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSubmitForm(false)}
                  className="btn btn-ghost"
                  style={{ padding: '8px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px' }}
                >
                  {submitting ? 'Submitting...' : 'Log Ticket'}
                </button>
              </div>
            </form>
          )}

          {/* Tickets List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading maintenance tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No active tickets found for this category.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tickets.map((t) => {
                const isResolved = t.status === 'Resolved by Warden/Caretaker';
                const isInvestigating = t.status === 'Under Investigation';

                return (
                  <div
                    key={t.id}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Upvote Pill Button */}
                    <button
                      onClick={() => handleUpvote(t.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 10px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#6ee7b7',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        minWidth: '48px',
                      }}
                      title="Upvote if you also experience this issue"
                    >
                      <ChevronUp size={18} strokeWidth={2.8} />
                      <span style={{ fontSize: '0.867rem', fontWeight: 800 }}>{t.upvotes}</span>
                      <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>votes</span>
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: t.scope === 'mess' ? 'rgba(251, 191, 36, 0.15)' : 'var(--accent-light)',
                              color: t.scope === 'mess' ? '#fbbf24' : 'var(--accent)',
                              border: t.scope === 'mess' ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid var(--accent-light)',
                            }}
                          >
                            {t.category}
                          </span>

                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: isResolved
                                ? 'rgba(16, 185, 129, 0.2)'
                                : isInvestigating
                                ? 'var(--accent-light)'
                                : 'rgba(245, 158, 11, 0.2)',
                              color: isResolved
                                ? '#4ade80'
                                : isInvestigating
                                ? 'var(--accent)'
                                : '#f59e0b',
                            }}
                          >
                            {t.status}
                          </span>
                        </div>

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Reported by {t.creatorName}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1.0rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                        {t.title}
                      </h4>

                      {t.description && (
                        <p style={{ fontSize: '0.833rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '4px' }}>
                          {t.description}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          marginTop: '8px',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
                          <MapPin size={12} /> {t.clusterOrMess} • {t.specificLocation} ({t.campus} Campus)
                        </span>

                        {t.resolvedAt && (
                          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Fixed by Caretaker
                          </span>
                        )}
                      </div>

                      {isHostelMessAdmin && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '10px',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--border-subtle)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                            Admin / Caretaker Actions:
                          </span>

                          {t.status === 'Reported' && (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'Under Investigation')}
                              className="btn btn-secondary"
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                background: 'var(--accent-light)',
                                color: 'var(--accent)',
                                borderColor: 'var(--accent-light)',
                              }}
                            >
                              Mark Under Investigation
                            </button>
                          )}

                          {t.status !== 'Resolved by Warden/Caretaker' && (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'Resolved by Warden/Caretaker')}
                              className="btn btn-secondary"
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                borderColor: 'rgba(16, 185, 129, 0.3)',
                              }}
                            >
                              Mark Resolved by Warden/Caretaker
                            </button>
                          )}

                          {t.status === 'Resolved by Warden/Caretaker' && (
                            <button
                              onClick={() => handleUpdateStatus(t.id, 'Reported')}
                              className="btn btn-ghost"
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.8rem',
                                borderRadius: '6px',
                                color: '#fbbf24',
                              }}
                            >
                              Re-open Issue
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
