import { create } from 'zustand';
import type { AuthUser } from '../types/user.types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthOperationInProgress: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setAuthOperationInProgress: (inProgress: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthOperationInProgress: false,
  setUser: (user): void => set({ user }),
  setLoading: (isLoading): void => set({ isLoading }),
  setAuthOperationInProgress: (isAuthOperationInProgress): void =>
    set({ isAuthOperationInProgress }),
}));
