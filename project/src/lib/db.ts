// API configuration
const API_BASE_URL = '/api';

export interface User {
  id: string;
  email: string;
  expiresAt: number;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  chat_number: number;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  sender: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const user = await response.json();
  return {
    ...user,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours from now
  };
}

export async function register(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  return response.json();
}

export async function logout(): Promise<void> {
  localStorage.removeItem('user');
}

export default logout