'use client';

import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { parseRollNumber } from '@/lib/campus';
import { Camera, GraduationCap, Loader2, LogOut, Save, Trash2, Upload, User } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile, uploadAvatar, deleteAvatar, logout } = useAuth();
  const { success, error } = useToast();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarKey, setAvatarKey] = useState<string | null>(profile?.avatar_key || null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = parseRollNumber(profile?.username || '');

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      error('Please select a JPG, PNG, WebP, or GIF image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error('Image is too large. Maximum size is 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Instant local preview for immediate visual feedback
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setIsUploadingAvatar(true);

    try {
      const updated = await uploadAvatar(file);
      setAvatarKey(updated.avatar_key);
      setAvatarPreview(null);
      success('Profile picture updated!');
    } catch (err: unknown) {
      setAvatarPreview(null);
      error((err instanceof Error ? err.message : '') || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    try {
      await deleteAvatar();
      setAvatarKey(null);
      setAvatarPreview(null);
      success('Profile picture removed.');
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to remove picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
    } catch {
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
            padding: '22px 20px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px',
            gap: '12px',
          }}
        >
          {/* Interactive Profile Photo Container */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                cursor: isUploadingAvatar ? 'wait' : 'pointer',
                borderRadius: '50%',
                position: 'relative',
                overflow: 'hidden',
              }}
              title="Click to upload profile picture"
              className="avatar-upload-trigger"
            >
              <Avatar
                name={displayName || profile?.username}
                src={avatarPreview || avatarKey}
                size="xl"
              />
              {/* Hover overlay with Camera icon */}
              <div
                className="avatar-hover-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.58)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  gap: '2px',
                }}
              >
                {isUploadingAvatar ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <>
                    <Camera size={20} />
                    <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>Change</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick-action Camera badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                border: '2px solid var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
              title="Upload new picture"
            >
              <Camera size={13} />
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleFileSelected}
            />
          </div>

          {/* Picture Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="btn btn-secondary"
              style={{
                fontSize: '0.78rem',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>{avatarKey ? 'Change Photo' : 'Upload Photo'}</span>
                </>
              )}
            </button>

            {(avatarKey || avatarPreview) && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
                className="btn btn-ghost"
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  color: 'var(--danger)',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                title="Remove current profile picture"
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2px' }}>
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
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <span>Enrollment Number</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace' }}>
            {profile?.username?.toUpperCase()}
          </span>
        </div>

        {/* Academic Branch Card */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <span>Academic Branch</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {profile?.chat_only ? 'Chat-only' : profile?.branch || 'Not configured'}
          </span>
        </div>

        {/* Campus Residence Card */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <span>Hostel & Dining</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {profile?.chat_only
              ? 'Chat-only (Services hidden)'
              : profile?.hostel && profile?.mess
              ? `${profile.hostel} ${profile.hostel_block ? `(${profile.hostel_block})` : ''} · ${profile.mess}`
              : 'Not configured'}
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
