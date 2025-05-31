import React, { createContext, useContext, useState, useEffect } from 'react';
import { login, logout, register } from '../lib/db';

interface User {
  id: string;
  email: string;
  expiresAt?: number;
}

interface AuthContextType {
  session: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return null;
    
    const user = JSON.parse(savedUser);
    // Check if session has expired
    if (user.expiresAt && user.expiresAt < Date.now()) {
      localStorage.removeItem('user');
      return null;
    }
    return user;
  });

  useEffect(() => {
    if (session) {
      // Set expiration time to 24 hours from now
      const userWithExpiry = {
        ...session,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      };
      localStorage.setItem('user', JSON.stringify(userWithExpiry));
    } else {
      localStorage.removeItem('user');
    }
  }, [session]);

  const value = {
    session,
    signIn: async (email: string, password: string) => {
      const user = await login(email, password);
      setSession(user);
    },
    signUp: async (email: string, password: string) => {
      const user = await register(email, password);
      setSession(user);
    },
    signOut: async () => {
      await logout();
      setSession(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}