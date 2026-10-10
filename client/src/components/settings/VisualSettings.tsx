'use client';

import { Modal } from '@/components/ui/Modal';
import { Check,Monitor,Moon,RotateCcw,Sun,Building } from 'lucide-react';
import React,{ createContext,useContext,useEffect,useRef,useState } from 'react';
import { useOptionalAuth } from '@/context/AuthContext';
import { HOSTEL_OPTIONS, HOSTEL_BLOCK_MAP, MESS_OPTIONS, BRANCH_OPTIONS } from '@/lib/residence';

type Preferences = {
  appearance: 'light' | 'dark' | 'system';
  accent: 'pine' | 'clay' | 'lake';
  textSize: 'small' | 'default' | 'large';
  density: 'comfortable' | 'compact';
  reduceMotion: boolean;
};
const defaults: Preferences = { appearance: 'system', accent: 'pine', textSize: 'default', density: 'comfortable', reduceMotion: false };
const storageKey = 'kamand-visual-settings';
const VisualContext = createContext<{ openSettings: () => void }>({ openSettings: () => {} });
export const useVisualSettings = () => useContext(VisualContext);

function readPreferences(): Preferences {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return {
      appearance: ['light', 'dark', 'system'].includes(stored.appearance) ? stored.appearance : defaults.appearance,
      accent: ['pine', 'clay', 'lake'].includes(stored.accent) ? stored.accent : defaults.accent,
      textSize: ['small', 'default', 'large'].includes(stored.textSize) ? stored.textSize : defaults.textSize,
      density: ['comfortable', 'compact'].includes(stored.density) ? stored.density : defaults.density,
      reduceMotion: typeof stored.reduceMotion === 'boolean' ? stored.reduceMotion : false,
    };
  } catch { return defaults; }
}

function ResidenceSettingsSection() {
  const auth = useOptionalAuth();
  const [branch, setBranch] = useState(auth?.profile?.branch || '');
  const [hostel, setHostel] = useState(auth?.profile?.hostel || '');
  const [hostelBlock, setHostelBlock] = useState(auth?.profile?.hostel_block || '');
  const [mess, setMess] = useState(auth?.profile?.mess || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  if (!auth?.profile) return null;

  const isChatOnly = Boolean(auth.profile.chat_only);
  const availableBlocks = hostel ? (HOSTEL_BLOCK_MAP[hostel] || []) : [];

  const handleHostelChange = (newHostel: string) => {
    setHostel(newHostel);
    const validBlocks = HOSTEL_BLOCK_MAP[newHostel] || [];
    if (!validBlocks.some((b) => b.id === hostelBlock)) {
      setHostelBlock(validBlocks.length === 1 ? validBlocks[0].id : '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branch || !hostel || !hostelBlock || !mess) {
      setError('Please select branch, hostel, block, and mess.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await auth.updateProfile({
        branch,
        hostel,
        hostel_block: hostelBlock,
        mess,
        chat_only: false,
      });
      setSuccess('Academic branch & residence updated! Enrolled chats are now active on your dashboard.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update residence details.');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToChatOnly = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await auth.updateProfile({
        chat_only: true,
      });
      setSuccess('Switched to chat-only mode. Branch, hostel, and mess services hidden.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <fieldset style={{ border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '16px' }}>
      <legend style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px', fontSize: '0.933rem', fontWeight: 600 }}>
        <Building size={16} /> Campus Cohort & Residence
      </legend>
      {isChatOnly ? (
        <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>Chat-only mode active:</strong> Hostel, block, mess, and branch chats are currently hidden. Select your details below to restore all enrolled services and room chats.
        </div>
      ) : (
        <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-secondary)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Currently enrolled: <strong>{auth.profile.branch || 'No branch'}</strong> · <strong>{auth.profile.hostel || 'No hostel'} {auth.profile.hostel_block ? `(${auth.profile.hostel_block})` : ''}</strong> · <strong>{auth.profile.mess || 'No mess'}</strong>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'grid', gap: '12px' }}>
        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor="settings-branch-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Academic Branch</label>
          <select
            id="settings-branch-select"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            disabled={saving}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="">Select your branch...</option>
            {BRANCH_OPTIONS.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor="settings-hostel-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Hostel</label>
            <select
              id="settings-hostel-select"
              value={hostel}
              onChange={(e) => handleHostelChange(e.target.value)}
              disabled={saving}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="">Select hostel...</option>
              {HOSTEL_OPTIONS.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label htmlFor="settings-block-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Block / Wing</label>
            <select
              id="settings-block-select"
              value={hostelBlock}
              onChange={(e) => setHostelBlock(e.target.value)}
              disabled={saving || !hostel}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="">{hostel ? 'Select block...' : 'Pick hostel'}</option>
              {availableBlocks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '6px' }}>
          <label htmlFor="settings-mess-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Dining Mess</label>
          <select
            id="settings-mess-select"
            value={mess}
            onChange={(e) => setMess(e.target.value)}
            disabled={saving}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="">Select your mess...</option>
            {MESS_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {error && <div style={{ color: 'var(--danger, #e53e3e)', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div style={{ color: 'var(--success, #38a169)', fontSize: '0.85rem' }}>{success}</div>}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !branch || !hostel || !hostelBlock || !mess}
          >
            {saving ? 'Saving...' : (isChatOnly ? 'Save & Restore All Rooms' : 'Save Details')}
          </button>
          {!isChatOnly && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleSwitchToChatOnly}
              disabled={saving}
              style={{ fontSize: '0.82rem' }}
            >
              Switch to Chat Only
            </button>
          )}
        </div>
      </form>
    </fieldset>
  );
}

export function VisualSettingsProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaults);
  const preferencesRef = useRef(defaults);
  const [isOpen, setIsOpen] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (value: Preferences) => {
      const root = document.documentElement;
      root.setAttribute('data-theme', value.appearance === 'system' ? (media.matches ? 'dark' : 'light') : value.appearance);
      root.setAttribute('data-accent', value.accent);
      root.setAttribute('data-text-size', value.textSize);
      root.setAttribute('data-density', value.density);
      root.setAttribute('data-reduce-motion', String(value.reduceMotion));
    };
    const sync = () => { const value = readPreferences(); preferencesRef.current = value; setPreferences(value); apply(value); };
    const syncMedia = () => apply(preferencesRef.current);
    sync();
    media.addEventListener('change', syncMedia);
    window.addEventListener('storage', sync);
    return () => { media.removeEventListener('change', syncMedia); window.removeEventListener('storage', sync); };
  }, []);
  const update = (value: Preferences) => {
    preferencesRef.current = value;
    setPreferences(value);
    const root = document.documentElement;
    root.setAttribute('data-theme', value.appearance === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : value.appearance);
    root.setAttribute('data-accent', value.accent);
    root.setAttribute('data-text-size', value.textSize);
    root.setAttribute('data-density', value.density);
    root.setAttribute('data-reduce-motion', String(value.reduceMotion));
    try { localStorage.setItem(storageKey, JSON.stringify(value)); setStorageWarning(false); }
    catch { setStorageWarning(true); }
  };
  const choose = <K extends keyof Preferences>(key: K, value: Preferences[K]) => update({ ...preferences, [key]: value });
  return <VisualContext.Provider value={{ openSettings: () => setIsOpen(true) }}>
    {children}
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Settings" description="Manage campus residence, services, and display preferences." maxWidth={560}>
      <div className="settings-content">
        <ResidenceSettingsSection />
        <fieldset><legend>Appearance</legend><div className="settings-options">
          {([{ value: 'light', label: 'Light', icon: Sun }, { value: 'dark', label: 'Dark', icon: Moon }, { value: 'system', label: 'System', icon: Monitor }] as const).map(({ value, label, icon: Icon }) =>
            <button key={value} className="setting-option" aria-pressed={preferences.appearance === value} onClick={() => choose('appearance', value)}><Icon size={20} /><span>{label}</span></button>)}
        </div></fieldset>
        <fieldset><legend>Accent colour</legend><div className="settings-options">
          {(['pine', 'clay', 'lake'] as const).map(value => <button key={value} className="setting-option" aria-pressed={preferences.accent === value} onClick={() => choose('accent', value)}><span className={`accent-swatch swatch-${value}`}>{preferences.accent === value && <Check size={14} />}</span><span>{value[0].toUpperCase() + value.slice(1)}</span></button>)}
        </div></fieldset>
        <fieldset><legend>Text size</legend><div className="settings-options">
          {(['small', 'default', 'large'] as const).map(value => <button key={value} className="setting-option" aria-pressed={preferences.textSize === value} onClick={() => choose('textSize', value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        </div></fieldset>
        <fieldset><legend>Message density</legend><div className="settings-options settings-two">
          {(['comfortable', 'compact'] as const).map(value => <button key={value} className="setting-option" aria-pressed={preferences.density === value} onClick={() => choose('density', value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}
        </div></fieldset>
        <label className="setting-switch"><span><strong>Reduce motion</strong><small>Your device’s reduced-motion preference is always respected.</small></span><input type="checkbox" role="switch" checked={preferences.reduceMotion} onChange={e => choose('reduceMotion', e.target.checked)} /></label>
        <div className="settings-preview"><span>Message preview</span><p>Same campus. A little more you.</p><small>Kamand Chat · Just now</small></div>
        <div className="settings-bottom"><small role="status">{storageWarning ? 'Applied for this visit. Browser storage is unavailable.' : 'Saved on this device.'}</small><button className="btn btn-ghost" onClick={() => update(defaults)}><RotateCcw size={15} />Reset</button></div>
      </div>
    </Modal>
  </VisualContext.Provider>;
}
