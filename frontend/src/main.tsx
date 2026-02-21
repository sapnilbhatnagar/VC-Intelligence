import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { createAppTheme } from './theme';
import { useJobStore } from './store/jobStore';

// ============================================================
// React Query client — conservative retry/stale settings
// ============================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ============================================================
// ThemedApp — reads themeMode from store and builds MUI theme
// This component must live inside QueryClientProvider so that
// the Zustand store (which uses no providers) can be read here.
// ============================================================
function ThemedApp() {
  const themeMode = useJobStore((s) => s.themeMode);
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

// ============================================================
// Root render
// ============================================================
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemedApp />
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
