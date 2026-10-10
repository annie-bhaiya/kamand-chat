'use client';

import { useVisualSettings } from '@/components/settings/VisualSettings';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { lookupCampusUser,parseRollNumber } from '@/lib/campus';
import { ArrowLeft,ArrowRight,CheckCircle2,Eye,EyeOff,GraduationCap,MapPin,MessageCircle,SlidersHorizontal,Users } from 'lucide-react';
import Link from 'next/link';
import React,{ useEffect,useState } from 'react';

type Stage = 'roll' | 'login' | 'register';
export function AuthCard() {
  const { login, register } = useAuth();
  const { error, success } = useToast();
  const { openSettings } = useVisualSettings();
  const [stage, setStage] = useState<Stage>('roll');
  const [roll, setRoll] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [health, setHealth] = useState('checking');
  const parsed = parseRollNumber(roll);
  const directoryName = parsed.isValid ? lookupCampusUser(parsed.normalizedRoll)?.name : undefined;
  useEffect(() => {
    let active = true;
    api.checkHealth().then(() => { if (active) setHealth('online'); }).catch(() => { if (active) setHealth('offline'); });
    return () => { active = false; };
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !parsed.isValid) return;
    setBusy(true);
    try {
      if (stage === 'roll') {
        const result = await api.checkUser(parsed.email);
        setName(result.display_name || directoryName || '');
        setStage(result.exists ? 'login' : 'register');
      } else {
        const displayName = name.trim() || directoryName || parsed.normalizedRoll;
        const result = stage === 'login' ? await login(parsed.email, password, displayName) : await register(parsed.email, password, displayName);
        if (result.requiresEmailConfirmation) {
          setConfirmation(true); setStage('login'); setPassword('');
          success('Check your institute inbox for the confirmation link.');
        } else success('Welcome to Kamand Chat.');
      }
    } catch (err) { error(err instanceof Error ? err.message : 'Could not connect. Please try again.'); }
    finally { setBusy(false); }
  };
  return <main className="auth-page">
    <section className="auth-story">
      <Link href="/" className="auth-brand"><GraduationCap size={30} /><span>Kamand Chat<small>IIT Mandi</small></span></Link>
      <div className="auth-story-copy"><h1>Your campus.<br />Closer together.</h1><p>From a quick question to the next big plan. A shared space for the people who make campus yours.</p>
        <div className="auth-feature"><MessageCircle size={20} /><span>Conversations that keep you connected</span></div>
        <div className="auth-feature"><Users size={20} /><span>Your classes, clubs and campus communities</span></div>
      </div>
      <div className="auth-location"><MapPin size={16} />North &amp; South campuses, IIT Mandi</div>
    </section>
    <section className="auth-form-side">
      <button className="btn btn-secondary auth-settings" onClick={openSettings}><SlidersHorizontal size={16} />Visual settings</button>
      <div className="auth-form-wrap">
        {stage !== 'roll' && <button className="btn btn-ghost auth-back" disabled={busy} onClick={() => { setStage('roll'); setPassword(''); setConfirmation(false); }}><ArrowLeft size={16} />Change roll number</button>}
        <h2>{stage === 'roll' ? 'Welcome to Kamand Chat' : stage === 'login' ? 'Good to see you again' : 'Make yourself at home'}</h2>
        <p className="auth-intro">{stage === 'roll' ? 'Start with your IIT Mandi roll number. We’ll find your account or help you create one.' : stage === 'login' ? `Sign in with your password for ${parsed.email}.` : `Create your account with ${parsed.email}.`}</p>
        {confirmation && <div className="auth-notice" role="status"><CheckCircle2 size={20} /><span>Confirmation email sent. Open the link in your institute inbox, then sign in.</span></div>}
        <form onSubmit={submit} className="auth-form" key={stage}>
          {stage === 'roll' ? <div className="input-group"><label htmlFor="roll" className="input-label">Roll number</label><input id="roll" className="input-control" placeholder="e.g. B26001 or IM26042" value={roll} onChange={e => setRoll(e.target.value.toUpperCase().replace(/\s+/g, ''))} autoComplete="username" autoCapitalize="characters" spellCheck={false} required aria-describedby="roll-help" /><p id="roll-help" className="field-help">{parsed.isValid ? `${parsed.email}${directoryName ? ` · ${directoryName}` : ''}` : 'Use your enrollment number, not your email address.'}</p></div> : <>
            {stage === 'register' && <div className="input-group"><label htmlFor="name" className="input-label">Your name</label><input id="name" className="input-control" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required maxLength={80} /></div>}
            <div className="input-group"><label htmlFor="password" className="input-label">{stage === 'register' ? 'Create a password' : 'Password'}</label><div className="password-field"><input id="password" className="input-control" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={stage === 'register' ? 'new-password' : 'current-password'} minLength={stage === 'register' ? 8 : undefined} required /><button type="button" className="btn-icon btn-ghost" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{stage === 'register' && <p className="field-help">Use at least 8 characters.</p>}</div>
          </>}
          <button className="btn btn-primary auth-submit" disabled={busy || !parsed.isValid} type="submit">{busy ? 'Please wait…' : stage === 'roll' ? 'Continue' : stage === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={18} /></button>
        </form>
        <div className="auth-connection" role="status"><span className={`status-dot ${health === 'online' ? 'online' : ''}`} />{health === 'online' ? 'Campus gateway is online' : health === 'offline' ? 'Gateway unavailable. You can try connecting again.' : 'Checking campus gateway…'}</div>
      </div>
      <p className="auth-footnote">A little less distance. A lot more campus.</p>
    </section>
  </main>;
}
