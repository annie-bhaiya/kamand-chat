'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Check, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

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

export function VisualSettingsProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaults);
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
    const sync = () => { const value = readPreferences(); setPreferences(value); apply(value); };
    sync();
    media.addEventListener('change', sync);
    window.addEventListener('storage', sync);
    return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', sync); };
  }, []);
  const update = (value: Preferences) => {
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
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Visual settings" description="Make campus feel like your space. Changes apply instantly." maxWidth={560}>
      <div className="settings-content">
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
        <div className="settings-preview"><span>Message preview</span><p>Same campus. A little more you.</p><small>KamandChat · Just now</small></div>
        <div className="settings-bottom"><small role="status">{storageWarning ? 'Applied for this visit. Browser storage is unavailable.' : 'Saved on this device.'}</small><button className="btn btn-ghost" onClick={() => update(defaults)}><RotateCcw size={15} />Reset</button></div>
      </div>
    </Modal>
  </VisualContext.Provider>;
}
