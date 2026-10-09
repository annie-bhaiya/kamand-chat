'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import {
  HOSTEL_OPTIONS,
  HOSTEL_BLOCK_MAP,
  MESS_OPTIONS,
  BRANCH_OPTIONS,
} from '@/lib/residence';
import {
  Building,
  UtensilsCrossed,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Layers,
} from 'lucide-react';

interface ResidenceOnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const ResidenceOnboardingModal: React.FC<ResidenceOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { profile, updateProfile } = useAuth();
  const { success, error } = useToast();

  const [selectedBranch, setSelectedBranch] = useState(profile?.branch || '');
  const [selectedHostel, setSelectedHostel] = useState(profile?.hostel || '');
  const [selectedBlock, setSelectedBlock] = useState(profile?.hostel_block || '');
  const [selectedMess, setSelectedMess] = useState(profile?.mess || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableBlocks = selectedHostel ? (HOSTEL_BLOCK_MAP[selectedHostel] || []) : [];

  const handleHostelChange = (newHostel: string) => {
    setSelectedHostel(newHostel);
    const validBlocks = HOSTEL_BLOCK_MAP[newHostel] || [];
    if (!validBlocks.some((b) => b.id === selectedBlock)) {
      setSelectedBlock(validBlocks.length === 1 ? validBlocks[0].id : '');
    }
  };

  const handleSaveResidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !selectedHostel || !selectedBlock || !selectedMess) {
      error('Please complete all selections (branch, hostel, block, and mess).');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        branch: selectedBranch,
        hostel: selectedHostel,
        hostel_block: selectedBlock,
        mess: selectedMess,
        chat_only: false,
      });
      success(`Welcome to ${selectedHostel} ${selectedBlock}!`);
      onClose?.();
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to save residence selection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueChatOnly = async () => {
    setIsSubmitting(true);
    try {
      await updateProfile({
        chat_only: true,
        branch: null,
        hostel: null,
        hostel_block: null,
        mess: null,
      });
      success('Chat-only mode activated. Residence and branch rooms hidden.');
      onClose?.();
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to set chat-only mode');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        // Prevent accidental backdrop closing without making a choice
      }}
      title="Campus Academic & Residence Setup"
      description="Connect directly to your branch, hostel wing, and dining hall communities."
      maxWidth={520}
    >
      <form onSubmit={handleSaveResidence} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Welcome Banner */}
        <div
          style={{
            padding: '12px 14px',
            background: 'var(--accent-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--foreground)' }}>
              IIT Mandi Cohort Enrollment
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '2px', lineHeight: 1.4 }}>
              Your selections ensure you only see and access chats and services for your specific academic branch, hostel block, and mess.
            </div>
          </div>
        </div>

        {/* Branch Selector */}
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="residence-branch-select" style={{ fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GraduationCap size={15} className="text-[var(--accent)]" />
            <span>Enrolled Academic Branch</span>
          </label>
          <select
            id="residence-branch-select"
            className="input"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', height: '42px', borderRadius: 'var(--radius-md)' }}
          >
            <option value="" disabled>
              Select your academic branch...
            </option>
            {['B.Tech', 'Dual Degree / BS', 'PG / Masters', 'Research'].map((deg) => (
              <optgroup key={deg} label={deg}>
                {BRANCH_OPTIONS.filter((b) => b.degree === deg).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* 2-Column Row: Hostel + Block */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
          {/* Hostel Selector */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="residence-hostel-select" style={{ fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={15} className="text-[var(--accent)]" />
              <span>Hostel Cluster</span>
            </label>
            <select
              id="residence-hostel-select"
              className="input"
              value={selectedHostel}
              onChange={(e) => handleHostelChange(e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', height: '42px', borderRadius: 'var(--radius-md)' }}
            >
              <option value="" disabled>
                Select hostel...
              </option>
              <optgroup label="North Campus">
                {HOSTEL_OPTIONS.filter((h) => h.campus === 'North').map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="South Campus">
                {HOSTEL_OPTIONS.filter((h) => h.campus === 'South').map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Block Selector */}
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="residence-block-select" style={{ fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={15} className="text-[var(--accent)]" />
              <span>Hostel Block</span>
            </label>
            <select
              id="residence-block-select"
              className="input"
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              disabled={isSubmitting || !selectedHostel}
              style={{ width: '100%', height: '42px', borderRadius: 'var(--radius-md)' }}
            >
              <option value="" disabled>
                {selectedHostel ? 'Select block...' : 'Pick hostel first'}
              </option>
              {availableBlocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mess Selector */}
        <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="residence-mess-select" style={{ fontSize: '0.84rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UtensilsCrossed size={15} className="text-[var(--accent)]" />
            <span>Dining Mess</span>
          </label>
          <select
            id="residence-mess-select"
            className="input"
            value={selectedMess}
            onChange={(e) => setSelectedMess(e.target.value)}
            disabled={isSubmitting}
            style={{ width: '100%', height: '42px', borderRadius: 'var(--radius-md)' }}
          >
            <option value="" disabled>
              Select your mess dining hall...
            </option>
            <optgroup label="North Campus">
              {MESS_OPTIONS.filter((m) => m.campus === 'North').map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="South Campus">
              {MESS_OPTIONS.filter((m) => m.campus === 'South').map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Primary Save Action */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!selectedBranch || !selectedHostel || !selectedBlock || !selectedMess || isSubmitting}
          style={{
            height: '42px',
            width: '100%',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '4px',
          }}
        >
          {isSubmitting ? (
            'Saving selection...'
          ) : (
            <>
              <span>Save & Continue to Dashboard</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: '2px 0',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            or
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Continue Only for Chat Option */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={handleContinueChatOnly}
            disabled={isSubmitting}
            className="btn btn-ghost"
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '0.84rem',
              color: 'var(--foreground-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <MessageSquare size={15} />
            <span>Continue only for chat</span>
          </button>
          <p
            style={{
              fontSize: '0.74rem',
              color: 'var(--foreground-muted)',
              marginTop: '6px',
              lineHeight: 1.3,
            }}
          >
            Hostel, mess, and branch rooms will be hidden on your dashboard. You can add or edit them anytime in Settings.
          </p>
        </div>
      </form>
    </Modal>
  );
};
