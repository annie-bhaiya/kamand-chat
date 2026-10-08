'use client';

import React, { useState, useEffect, useEffectEvent } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { CampusEvent } from '@/types/chat';
import { canManageEvents } from '@/lib/campus-rooms';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Filter,
  X,
  Sparkles,
  Building,
  GraduationCap,
  Lock,
} from 'lucide-react';

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
  isAdmin,
}) => {
  const { error, success } = useToast();
  const { profile } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<string>('All Venues');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [showBookingForm, setShowBookingForm] = useState(false);

  const roll = profile?.username?.toLowerCase() || '';
  const canBook =
    isAdmin !== undefined
      ? isAdmin
      : canManageEvents(roll, defaultOrganizer);

  // Booking Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CampusEvent['category']>('Club Workshop');
  const [organizer, setOrganizer] = useState(defaultOrganizer || '');
  const [venue, setVenue] = useState<CampusEvent['venue']>('Auditorium A1/A2');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('05:30 PM');
  const [endTime, setEndTime] = useState('08:30 PM');
  const [submitting, setSubmitting] = useState(false);




  const loadEvents = async () => {
    setLoading(true);
    try {
      const v = selectedVenue === 'All Venues' ? undefined : selectedVenue;
      const c = selectedCategory === 'All Categories' ? undefined : selectedCategory;
      const res = await api.getCampusEvents(v, c);
      setEvents(res.data || []);
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to load Gymkhana calendar events.');
    } finally {
      setLoading(false);
    }
  };
  const loadOnOpen = useEffectEvent(() => loadEvents());
  useEffect(() => { if (isOpen) loadOnOpen(); }, [isOpen, selectedVenue, selectedCategory]);

  const handleBookEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !organizer.trim() || !date) {
      error('Please fill in event title, organizer, and date.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createCampusEvent({
        title: title.trim(),
        description: description.trim(),
        category,
        organizer: organizer.trim(),
        venue,
        date,
        startTime,
        endTime,
      });

      if ('warning' in res && typeof res.warning === 'string') {
        error(res.warning);
      } else {
        success(`Event "${title}" proposed and scheduled at ${venue}!`);
      }

      setShowBookingForm(false);
      setTitle('');
      setDescription('');
      loadEvents();
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Booking submission failed.');
    } finally {
      setSubmitting(false);
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
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg), 0 0 60px var(--accent-light)',
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
                boxShadow: '0 4px 14px var(--accent-light)',
              }}
            >
              <CalendarIcon size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  Unified Gymkhana Calendar
                </h2>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'var(--accent-light)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent-light)',
                  }}
                >
                  IIT Mandi Intracampus
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Central venue bookings for Auditorium A1/A2, A13 Hall, South Grounds & Seminar Halls
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {canBook ? (
              <button
                onClick={() => setShowBookingForm(!showBookingForm)}
                className="btn btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.833rem' }}
              >
                {showBookingForm ? <X size={15} /> : <Plus size={15} />}
                <span>{showBookingForm ? 'Close Form' : 'Book Venue / Event'}</span>
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--border-subtle)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
                title="Only Club Coordinators, Branch Representatives, and Gymkhana Admins can book venues"
              >
                <Lock size={13} className="text-[var(--accent)]" />
                <span>Coordinator Privileges Required to Book</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: '8px', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={13} /> Venue:
            </span>
            {VENUES.map((v) => (
              <button
                key={v}
                onClick={() => setSelectedVenue(v)}
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: selectedVenue === v ? 'var(--accent-light)' : 'var(--border-subtle)',
                  color: selectedVenue === v ? 'var(--accent)' : 'var(--text-secondary)',
                  border: selectedVenue === v ? '1px solid var(--accent-light)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {v}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input-control"
              style={{ fontSize: '0.8rem', padding: '4px 10px', width: 'auto', height: 'auto' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} style={{ background: '#0f172a' }}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Booking Form Overlay / Dropdown */}
          {showBookingForm && (
            <form
              onSubmit={handleBookEvent}
              style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--accent-light)',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.0rem', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} /> In-App Event & Venue Booking Proposal
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Society Heads & Branch Representatives
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Event Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robotronics ROS2 Hands-on Sprint"
                    className="input-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Organizing Society / Club / Cohort</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KamandPrompt, Exodia Team, B.Tech CSE"
                    className="input-control"
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                  />
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Target Venue (Reservation)</label>
                  <select
                    className="input-control"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value as CampusEvent['venue'])}
                  >
                    <option value="Auditorium A1/A2" style={{ background: '#0f172a' }}>Auditorium A1/A2</option>
                    <option value="A13 Hall" style={{ background: '#0f172a' }}>A13 Hall</option>
                    <option value="South Campus Grounds" style={{ background: '#0f172a' }}>South Campus Grounds</option>
                    <option value="SCEE Seminar Hall" style={{ background: '#0f172a' }}>SCEE Seminar Hall</option>
                    <option value="Sports Complex" style={{ background: '#0f172a' }}>Sports Complex</option>
                    <option value="Other" style={{ background: '#0f172a' }}>Other Campus Location</option>
                  </select>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Category</label>
                  <select
                    className="input-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as CampusEvent['category'])}
                  >
                    <option value="Club Workshop" style={{ background: '#0f172a' }}>Club Workshop</option>
                    <option value="Fest Event" style={{ background: '#0f172a' }}>Fest Event (Exodia / Frosthack)</option>
                    <option value="Sports Tournament" style={{ background: '#0f172a' }}>Sports Tournament (Rann-Neeti)</option>
                    <option value="Placement & Tech Talk" style={{ background: '#0f172a' }}>Placement & Tech Talk</option>
                    <option value="General" style={{ background: '#0f172a' }}>General Student Gathering</option>
                  </select>
                </div>

                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label">Event Date</label>
                  <input
                    type="date"
                    required
                    className="input-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">Start Time</label>
                    <input
                      type="text"
                      placeholder="05:30 PM"
                      className="input-control"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label className="input-label">End Time</label>
                    <input
                      type="text"
                      placeholder="08:30 PM"
                      className="input-control"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label className="input-label">Description & AV Requirements</label>
                <textarea
                  rows={2}
                  placeholder="Details, projector, mics, chairs, or guest info..."
                  className="input-control"
                  style={{ resize: 'vertical' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
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
                  {submitting ? 'Checking collisions...' : 'Submit Booking'}
                </button>
              </div>
            </form>
          )}

          {/* Events List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Loading Gymkhana calendar events...
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No scheduled events found for this filter.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {events.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: evt.status === 'conflict' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background:
                              evt.category === 'Fest Event'
                                ? 'rgba(236, 72, 153, 0.2)'
                                : evt.category === 'Sports Tournament'
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'var(--accent-light)',
                            color:
                              evt.category === 'Fest Event'
                                ? '#f472b6'
                                : evt.category === 'Sports Tournament'
                                ? '#4ade80'
                                : 'var(--accent)',
                          }}
                        >
                          {evt.category}
                        </span>

                        {evt.status === 'conflict' && (
                          <span
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: 'rgba(244, 63, 94, 0.2)',
                              color: '#fb7185',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <AlertTriangle size={11} /> Collision Detected
                          </span>
                        )}

                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Organized by <strong style={{ color: '#e2e8f0' }}>{evt.organizer}</strong>
                        </span>
                      </div>

                      <h4 style={{ fontSize: '1.067rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                        {evt.title}
                      </h4>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.867rem', fontWeight: 700, color: 'var(--accent)' }}>
                        {evt.date}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                        <Clock size={12} /> {evt.startTime} - {evt.endTime}
                      </div>
                    </div>
                  </div>

                  {evt.description && (
                    <p style={{ fontSize: '0.833rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {evt.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6ee7b7' }}>
                      <MapPin size={13} />
                      <span style={{ fontWeight: 600 }}>{evt.venue}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      <CheckCircle2 size={13} color="#10b981" />
                      <span>Gymkhana Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
