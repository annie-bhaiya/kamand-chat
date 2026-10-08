'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { parseRollNumber } from '@/lib/campus';
import { User, LogOut, Save, GraduationCap, Building2 } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, logout } = useAuth();
  const { success, error } = useToast();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarKey, setAvatarKey] = useState<string | null>(profile?.avatar_key || null);
  const [isSaving, setIsSaving] = useState(false);



  const parsed = parseRollNumber(profile?.username || '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      error('Display name cannot be blank');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim(),
        avatar_key: avatarKey,
      });
      success('Campus profile updated!');
      onClose();
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch (err: unknown) {
      error('Logout failed');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Campus Profile"
      description="IIT Mandi Intranet Account"
      maxWidth={460}
    >
      <form onSubmit={handleSave}>
        {/* Profile Header Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px',
            gap: '10px',
          }}
        >
          <Avatar name={displayName || profile?.username} src={avatarKey} size="xl" />
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ fontSize: '1.133rem', fontWeight: 700 }}>
              {displayName || 'Student'}
            </h4>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                color: 'var(--accent)',
                fontFamily: 'monospace',
                fontWeight: 600,
                marginTop: '3px',
              }}
            >
              <GraduationCap size={14} />
              <span>{profile?.username ? profile.username.toUpperCase() : 'STUDENT'}</span>
              <span>•</span>
              <span>{parsed.hierarchyName || 'IIT Mandi'}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {user?.email || `${profile?.username}@students.iitmandi.ac.in`}
            </div>
          </div>
        </div>

        {/* Display Name Input */}
        <div className="input-group">
          <label className="input-label">Display Name</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              required
              maxLength={80}
              placeholder="Your name"
              className="input-control"
              style={{ paddingLeft: '38px' }}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <User
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
          </div>
        </div>

        {/* Permanent Enrollment Number Card */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--border-subtle)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <span>Enrollment Number</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
            {profile?.username?.toUpperCase()}
          </span>
        </div>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-danger"
            style={{ flex: 1 }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
