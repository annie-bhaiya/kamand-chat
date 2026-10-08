'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import {
  parseRollNumber,
  isValidRollNumber,
  lookupCampusUser,
} from '@/lib/campus';
import {
  MessageSquare,
  Shield,
  CheckCircle2,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  GraduationCap,
  Building2,
  MapPin,
} from 'lucide-react';

type AuthStage = 'roll' | 'login' | 'register';

export const AuthCard: React.FC = () => {
  const { login, register } = useAuth();
  const { error, success } = useToast();

  const [stage, setStage] = useState<AuthStage>('roll');
  const [rollInput, setRollInput] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [foundDirectoryName, setFoundDirectoryName] = useState<string | null>(null);
  const [existingUserDisplayName, setExistingUserDisplayName] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [serverHealth, setServerHealth] = useState<'checking' | 'online' | 'offline'>('checking');

  // Parse roll on the fly
  const parsed = parseRollNumber(rollInput);

  useEffect(() => {
    api.checkHealth()
      .then(() => setServerHealth('online'))
      .catch(() => setServerHealth('offline'));
  }, []);

  // When roll number changes, check if they are in client/users.json
  useEffect(() => {
    if (parsed.isValid) {
      const match = lookupCampusUser(parsed.normalizedRoll);
      if (match) {
        setFoundDirectoryName(match.name);
        setDisplayName(match.name);
      } else {
        setFoundDirectoryName(null);
      }
    } else {
      setFoundDirectoryName(null);
    }
  }, [parsed.isValid, parsed.normalizedRoll]);

  // Handle Step 1: Submit Roll Number
  const handleRollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.isValid) {
      error('Please enter a valid IIT Mandi roll number (format: XYYZZZ, e.g. B26001 or IM26042).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if user exists in authenticated users
      const checkResult = await api.checkUser(parsed.email);
      if (checkResult && checkResult.exists) {
        // User exists -> Ask for password to sign in
        setExistingUserDisplayName(checkResult.display_name || foundDirectoryName || parsed.normalizedRoll);
        setStage('login');
      } else {
        // User does not exist in database yet -> Ask to create password
        const match = lookupCampusUser(parsed.normalizedRoll);
        if (match) {
          setFoundDirectoryName(match.name);
          setDisplayName(match.name);
        } else {
          setFoundDirectoryName(null);
          setDisplayName('');
        }
        setStage('register');
      }
    } catch (err: any) {
      console.warn('Check user failed:', err);
      const match = lookupCampusUser(parsed.normalizedRoll);
      if (match) {
        setFoundDirectoryName(match.name);
        setDisplayName(match.name);
      }
      setStage('register');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Step 2: Sign In or Register with password
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      error('Password is required');
      return;
    }

    setIsSubmitting(true);
    const finalName = displayName.trim() || foundDirectoryName || parsed.normalizedRoll;

    try {
      if (stage === 'login') {
        const loginRes = await login(parsed.email, password, finalName);
        if (loginRes.autoCreated || loginRes.requiresEmailConfirmation) {
          setRequiresConfirmation(true);
          success(`Account created for ${parsed.normalizedRoll}! Confirmation email sent to ${parsed.email}.`);
        } else {
          success(`Welcome back to KamandChat!`);
        }
      } else {
        if (!finalName) {
          error('Please provide your name');
          setIsSubmitting(false);
          return;
        }

        const res = await register(parsed.email, password, finalName);
        if (res.requiresEmailConfirmation) {
          setRequiresConfirmation(true);
          setStage('login');
          setExistingUserDisplayName(finalName);
          success(`Account created! Confirmation link sent to ${parsed.email}. Please verify your email before logging in.`);
        } else {
          success(`Welcome to KamandChat, ${finalName}!`);
        }
      }
    } catch (err: any) {
      error(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-lg), 0 0 50px rgba(99, 102, 241, 0.2)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Decorative Top Accent: Himalayan Gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #0284c7 0%, #6366f1 50%, #ec4899 100%)',
          }}
        />

        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)',
              marginBottom: '14px',
            }}
          >
            <GraduationCap size={28} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.02em' }}>
            KamandChat
          </h1>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 10px',
              borderRadius: '9999px',
              background: 'rgba(2, 132, 199, 0.12)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              fontSize: '11.5px',
              fontWeight: 600,
              color: '#38bdf8',
            }}
          >
            <MapPin size={12} />
            <span>IIT Mandi • North & South Campuses</span>
          </div>
        </div>

        {/* Email Confirmation Notice */}
        {requiresConfirmation && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '20px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#6ee7b7' }}>
                Confirmation Email Sent
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                A confirmation link was sent to <strong>{parsed.email}</strong>. Once confirmed, sign in.
              </p>
            </div>
          </div>
        )}

        {/* STAGE 1: Enter Roll Number */}
        {stage === 'roll' && (
          <form onSubmit={handleRollSubmit}>
            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Enrollment / Roll Number</span>
                <span style={{ color: 'var(--text-muted)', textTransform: 'none' }}>Format: XYYZZZ</span>
              </label>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. B26001 or IM26042"
                  className="input-control"
                  style={{
                    paddingLeft: '38px',
                    fontSize: '16px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                  value={rollInput}
                  onChange={(e) => setRollInput(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                />
                <GraduationCap
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--accent)',
                  }}
                />
              </div>
            </div>

            {/* Live Parsing Preview Card */}
            {parsed.isValid ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  animation: 'fadeIn 0.2s ease-out',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#a5b4fc' }}>
                    {parsed.hierarchyName} • Batch &apos;{parsed.year}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Roll #{parsed.rollNumber}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Email: <span style={{ color: '#ffffff' }}>{parsed.email}</span>
                </div>

                {foundDirectoryName && (
                  <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '2px', fontWeight: 600 }}>
                    Campus Record: {foundDirectoryName}
                  </div>
                )}
              </div>
            ) : rollInput.length > 0 ? (
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--warning)',
                  marginBottom: '16px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(245, 158, 11, 0.1)',
                }}
              >
                Expected hierarchy code (e.g. B, IM), 2-digit year (e.g. 26), and roll number (e.g. 001).
              </div>
            ) : (
              <div
                style={{
                  fontSize: '11.5px',
                  color: 'var(--text-muted)',
                  marginBottom: '20px',
                  lineHeight: 1.5,
                }}
              >
                Sign in with your IIT Mandi roll number. We&apos;ll automatically identify whether you already have an account or set one up.
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !parsed.isValid}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              <span>{isSubmitting ? 'Checking records...' : 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* STAGE 2A: Existing User -> Enter Password */}
        {stage === 'login' && (
          <form onSubmit={handleAuthSubmit}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '18px',
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {existingUserDisplayName || parsed.normalizedRoll}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {parsed.normalizedRoll} • {parsed.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStage('roll');
                  setPassword('');
                }}
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: '11.5px' }}
              >
                Change
              </button>
            </div>

            <div className="input-group">
              <label className="input-label">Enter Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoFocus
                  placeholder="••••••••"
                  className="input-control"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In to KamandChat'}
            </button>
          </form>
        )}

        {/* STAGE 2B: New User -> Create Password & Confirm Name */}
        {stage === 'register' && (
          <form onSubmit={handleAuthSubmit}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(2, 132, 199, 0.1)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                  New Student Registration
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {parsed.normalizedRoll} • {parsed.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStage('roll');
                  setPassword('');
                }}
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: '11.5px' }}
              >
                Change
              </button>
            </div>

            {/* Name from Directory or Manual Entry */}
            {foundDirectoryName ? (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6ee7b7', fontWeight: 700 }}>
                  Verified from Campus Records:
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                  {foundDirectoryName}
                </div>
              </div>
            ) : (
              <div className="input-group">
                <label className="input-label">Your Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
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
            )}

            <div className="input-group">
              <label className="input-label">Create Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="input-control"
                  style={{ paddingLeft: '38px', paddingRight: '38px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account & Join KamandChat'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              className={`status-dot ${serverHealth === 'online' ? 'online' : ''}`}
              style={{
                backgroundColor:
                  serverHealth === 'online'
                    ? '#10b981'
                    : serverHealth === 'checking'
                    ? '#f59e0b'
                    : '#f43f5e',
              }}
            />
            <span>
              {serverHealth === 'online'
                ? 'Campus Gateway Online'
                : serverHealth === 'checking'
                ? 'Connecting...'
                : 'Server Offline'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Building2 size={13} />
            <span>IIT Mandi Intranet</span>
          </div>
        </div>
      </div>
    </div>
  );
};
