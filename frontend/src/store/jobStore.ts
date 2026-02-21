import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { StatusResponse, ResultsResponse, AccessibilitySettings, ThemeMode } from '../types';

// ============================================================
// State Shape
// ============================================================
interface JobState {
  // Active job tracking
  currentJobId: string | null;
  currentJobStatus: StatusResponse | null;
  currentResults: ResultsResponse | null;

  // Pending analysis (Get Ready preview flow)
  pendingAnalysis: { company: string; selectedStages: number[] | null } | null;

  // Accessibility / display preferences
  accessibilitySettings: AccessibilitySettings;

  // Theme
  themeMode: ThemeMode;

  // App-level UI state
  sidebarOpen: boolean;
  apiHealthy: boolean | null;

  // In-flight stop/resume flags
  stopInProgress: boolean;
  resumeInProgress: boolean;

  // Actions
  setCurrentJobId: (jobId: string | null) => void;
  setCurrentJobStatus: (status: StatusResponse | null) => void;
  setCurrentResults: (results: ResultsResponse | null) => void;
  clearCurrentJob: () => void;

  setPendingAnalysis: (data: { company: string; selectedStages: number[] | null } | null) => void;

  updateAccessibility: (patch: Partial<AccessibilitySettings>) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setApiHealthy: (healthy: boolean | null) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setStopInProgress: (v: boolean) => void;
  setResumeInProgress: (v: boolean) => void;
}

// ============================================================
// Store
// ============================================================
export const useJobStore = create<JobState>()(
  devtools(
    persist(
      (set) => ({
        // ── Initial state ─────────────────────────────────────
        currentJobId: null,
        currentJobStatus: null,
        currentResults: null,
        pendingAnalysis: null,

        accessibilitySettings: {
          darkMode: true,
          highContrast: false,
          fontSize: 100,
          reducedMotion: false,
        },

        themeMode: 'dark',
        sidebarOpen: true,
        apiHealthy: null,
        stopInProgress: false,
        resumeInProgress: false,

        // ── Actions ───────────────────────────────────────────
        setCurrentJobId: (jobId) =>
          set({ currentJobId: jobId }, false, 'setCurrentJobId'),

        setCurrentJobStatus: (status) =>
          set({ currentJobStatus: status }, false, 'setCurrentJobStatus'),

        setCurrentResults: (results) =>
          set({ currentResults: results }, false, 'setCurrentResults'),

        clearCurrentJob: () =>
          set(
            { currentJobId: null, currentJobStatus: null, currentResults: null },
            false,
            'clearCurrentJob'
          ),

        setPendingAnalysis: (data) =>
          set({ pendingAnalysis: data }, false, 'setPendingAnalysis'),

        updateAccessibility: (patch) =>
          set(
            (state) => ({
              accessibilitySettings: { ...state.accessibilitySettings, ...patch },
            }),
            false,
            'updateAccessibility'
          ),

        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar'),

        setSidebarOpen: (open) =>
          set({ sidebarOpen: open }, false, 'setSidebarOpen'),

        setApiHealthy: (healthy) =>
          set({ apiHealthy: healthy }, false, 'setApiHealthy'),

        setThemeMode: (mode) =>
          set({ themeMode: mode }, false, 'setThemeMode'),

        setStopInProgress: (v) =>
          set({ stopInProgress: v }, false, 'setStopInProgress'),

        setResumeInProgress: (v) =>
          set({ resumeInProgress: v }, false, 'setResumeInProgress'),
      }),
      {
        name: 'vc-job-store',
        // Persist preferences, theme, and the last active job ID so
        // the nav can redirect back to a running job after a reload.
        partialize: (state) => ({
          accessibilitySettings: state.accessibilitySettings,
          sidebarOpen: state.sidebarOpen,
          themeMode: state.themeMode,
          currentJobId: state.currentJobId,
        }),
      }
    ),
    { name: 'VC Intelligence Store' }
  )
);
