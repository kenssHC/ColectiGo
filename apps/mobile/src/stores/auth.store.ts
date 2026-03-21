import { create } from 'zustand';
import type { LocalUser } from '../types/user.types';

interface AuthState {
  user: LocalUser | null;
  isLoading: boolean;
  setUser: (user: LocalUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
