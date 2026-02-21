import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { AuthUser } from '../types';

// ============================================================
// State Shape
// ============================================================
interface AuthState {
  token: string | null;
  user: AuthUser | null;

  // Actions
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  updateCredits: (credits: number) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

// ============================================================
// Store — persisted to localStorage so sessions survive refresh
// ============================================================
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        token: null,
        user: null,

        setAuth: (token, user) =>
          set({ token, user }, false, 'setAuth'),

        clearAuth: () =>
          set({ token: null, user: null }, false, 'clearAuth'),

        updateCredits: (credits) =>
          set(
            (state) =>
              state.user ? { user: { ...state.user, credits } } : {},
            false,
            'updateCredits'
          ),

        updateUser: (patch) =>
          set(
            (state) =>
              state.user ? { user: { ...state.user, ...patch } } : {},
            false,
            'updateUser'
          ),
      }),
      {
        name: 'vc-auth-store',
        // Persist both token and user so the session is restored on refresh
        partialize: (state) => ({
          token: state.token,
          user: state.user,
        }),
      }
    ),
    { name: 'VC Auth Store' }
  )
);

// ============================================================
// Selector helpers
// ============================================================
export const selectToken = (s: AuthState) => s.token;
export const selectUser = (s: AuthState) => s.user;
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'admin';
export const selectIsLoggedIn = (s: AuthState) => s.token !== null;
