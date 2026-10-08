'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { socketManager } from '@/lib/socket';
import { Profile } from '@/types/chat';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    pass: string,
    displayName?: string
  ) => Promise<{ autoCreated?: boolean; requiresEmailConfirmation?: boolean }>;
  register: (
    email: string,
    pass: string,
    displayName: string
  ) => Promise<{ requiresEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    username?: string;
    display_name?: string;
    avatar_key?: string | null;
  }) => Promise<Profile>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = useCallback(async () => {
    try {
      const token = api.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const res = await api.getMe();
      if (res.data) {
        setUser(res.data.user);
        setProfile(res.data.profile);
        socketManager.connect(token);
      }
    } catch {
      // Token might be invalid or expired; try refresh
      const newToken = await api.refreshTokenIfNeeded();
      if (newToken) {
        try {
          const res = await api.getMe();
          if (res.data) {
            setUser(res.data.user);
            setProfile(res.data.profile);
            socketManager.connect(newToken);
          }
        } catch {
          api.setSession(null);
          setUser(null);
          setProfile(null);
        }
      } else {
        api.setSession(null);
        setUser(null);
        setProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email: string, pass: string, displayName?: string) => {
    const res = await api.login({ email, password: pass, display_name: displayName });
    if (res.data?.session) {
      setUser(res.data.user);
      const meRes = await api.getMe();
      if (meRes.data?.profile) {
        setProfile(meRes.data.profile);
      }
      socketManager.connect(res.data.session.access_token);
      return { autoCreated: false, requiresEmailConfirmation: false };
    }
    return {
      autoCreated: !!res.data?.auto_created,
      requiresEmailConfirmation: !!res.data?.requires_email_confirmation,
    };
  };

  const register = async (email: string, pass: string, displayName: string) => {
    const res = await api.register({
      email,
      password: pass,
      display_name: displayName,
    });
    if (res.data?.session) {
      setUser(res.data.user);
      const meRes = await api.getMe();
      if (meRes.data?.profile) {
        setProfile(meRes.data.profile);
      }
      socketManager.connect(res.data.session.access_token);
      return { requiresEmailConfirmation: false };
    }
    return {
      requiresEmailConfirmation: !!res.data?.requires_email_confirmation,
    };
  };

  const logout = async () => {
    const refreshToken = api.getRefreshToken();
    if (refreshToken) {
      try {
        await api.logout(refreshToken);
      } catch {
        // Continue clearing client state regardless
      }
    } else {
      api.setSession(null);
    }
    socketManager.disconnect();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data: {
    username?: string;
    display_name?: string;
    avatar_key?: string | null;
  }) => {
    const res = await api.updateMe(data);
    if (res.data) {
      setProfile(res.data);
      return res.data;
    }
    throw new Error('Failed to update profile');
  };

  const refreshProfile = async () => {
    const res = await api.getMe();
    if (res.data?.profile) {
      setProfile(res.data.profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user && !!profile,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
