'use client';

import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { AuthSession,Profile } from '@/types/chat';
import React,{ createContext,useCallback,useContext,useEffect,useRef,useState } from 'react';

interface AuthContextType {
  user: AuthSession['user'] | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string, displayName?: string) => Promise<{ autoCreated?: boolean; requiresEmailConfirmation?: boolean }>;
  register: (email: string, pass: string, displayName: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (data: { username?: string; display_name?: string; avatar_key?: string | null; hostel?: string | null; hostel_block?: string | null; branch?: string | null; mess?: string | null; chat_only?: boolean }) => Promise<Profile>;
  uploadAvatar: (file: File) => Promise<Profile>;
  deleteAvatar: () => Promise<Profile>;
  refreshProfile: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const generation = useRef(0);

  const restoreSession = useCallback(async () => {
    const operation = ++generation.current;
    try {
      // Recovery links must open the password form even when another session is saved.
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (hash.get('type') === 'recovery' || hash.has('error')) return;
      if (!api.getAccessToken()) return;
      let response;
      try { response = await api.getMe(); }
      catch (err) {
        // Only an authentication failure warrants token refresh; outages preserve the saved session.
        if (!(err instanceof Error) || (err as Error & { code?: string }).code !== 'UNAUTHENTICATED') throw err;
        const token = await api.refreshTokenIfNeeded();
        if (!token || operation !== generation.current) return;
        response = await api.getMe();
      }
      if (operation !== generation.current) return;
      if (response.data?.profile) {
        setUser(response.data.user);
        setProfile(response.data.profile);
        const token = api.getAccessToken();
        if (token) socketManager.connect(token);
      }
    } catch {
      // Show sign-in while retaining saved credentials during a temporary network outage.
    } finally {
      if (operation === generation.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Restoring the session also resolves the initial loading state when no token exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void restoreSession();
    const expired = () => {
      generation.current += 1;
      socketManager.disconnect();
      setUser(null); setProfile(null); setIsLoading(false);
    };
    const refreshed = () => { const token = api.getAccessToken(); if (token) socketManager.updateToken(token); };
    const storage = (event: StorageEvent) => {
      if (event.key === 'fc_access_token' && event.newValue === null) { api.setSession(null); expired(); }
    };
    window.addEventListener('kamand:session-expired', expired);
    window.addEventListener('kamand:session-refreshed', refreshed);
    window.addEventListener('storage', storage);
    return () => {
      generation.current += 1;
      socketManager.disconnect();
      window.removeEventListener('kamand:session-expired', expired);
      window.removeEventListener('kamand:session-refreshed', refreshed);
      window.removeEventListener('storage', storage);
    };
  }, [restoreSession]);

  const finishSignIn = async (operation: number, authenticatedUser: AuthSession['user']) => {
    const response = await api.getMe();
    if (operation !== generation.current) return;
    if (!response.data?.profile) throw new Error('Could not load your campus profile. Please sign in again.');
    setUser(authenticatedUser); setProfile(response.data.profile);
    const token = api.getAccessToken();
    if (token) socketManager.connect(token);
  };
  const login: AuthContextType['login'] = async (email, password, displayName) => {
    const operation = ++generation.current;
    const response = await api.login({ email, password, display_name: displayName });
    if (response.data?.session) {
      await finishSignIn(operation, response.data.user);
      return { autoCreated: false, requiresEmailConfirmation: false };
    }
    return { autoCreated: !!response.data?.auto_created, requiresEmailConfirmation: !!response.data?.requires_email_confirmation };
  };
  const register: AuthContextType['register'] = async (email, password, displayName) => {
    const operation = ++generation.current;
    const response = await api.register({ email, password, display_name: displayName });
    if (response.data?.session) {
      await finishSignIn(operation, response.data.user);
      return { requiresEmailConfirmation: false };
    }
    return { requiresEmailConfirmation: !!response.data?.requires_email_confirmation };
  };
  const logout = async () => {
    generation.current += 1;
    const refresh = api.getRefreshToken();
    const request = refresh ? api.logout(refresh) : Promise.resolve(api.setSession(null));
    socketManager.disconnect(); setUser(null); setProfile(null); setIsLoading(false);
    try { await request; } catch { /* Local sign-out is complete even if revocation is temporarily unavailable. */ }
  };
  const updateProfile: AuthContextType['updateProfile'] = async data => {
    const operation = generation.current;
    const response = await api.updateMe(data);
    if (!response.data) throw new Error('Could not save profile.');
    if (operation === generation.current) setProfile(response.data);
    return response.data;
  };
  const uploadAvatar = async (file: File) => {
    const operation = generation.current;
    const response = await api.uploadAvatar(file);
    if (!response.data) throw new Error('Could not upload profile picture.');
    if (operation === generation.current) setProfile(response.data);
    return response.data;
  };
  const deleteAvatar = async () => {
    const operation = generation.current;
    const response = await api.deleteAvatar();
    if (!response.data) throw new Error('Could not remove profile picture.');
    if (operation === generation.current) setProfile(response.data);
    return response.data;
  };
  const refreshProfile = async () => {
    const operation = generation.current;
    const response = await api.getMe();
    if (operation === generation.current && response.data?.profile) setProfile(response.data.profile);
  };
  return <AuthContext.Provider value={{ user, profile, isAuthenticated: !!user && !!profile, isLoading, login, register, logout, updateProfile, uploadAvatar, deleteAvatar, refreshProfile }}>{children}</AuthContext.Provider>;
};
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
export function useOptionalAuth() {
  return useContext(AuthContext);
}
