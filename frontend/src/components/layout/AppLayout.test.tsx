import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../theme';
import AppLayout from './AppLayout';
import { useAuthStore } from '../../store/authStore';

vi.mock('../../api/client', () => ({
  checkHealth: vi.fn().mockResolvedValue(true),
}));

function renderShell() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <AppLayout>
          <div>page content</div>
        </AppLayout>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('AppLayout (left-rail shell)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: 'tok',
      user: {
        id: 'u1',
        email: 'jane@fund.com',
        name: 'Jane',
        role: 'user',
        credits: 12,
      },
    });
  });

  it('shows the rail navigation and the page content', () => {
    renderShell();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getAllByText('Deal desk').length).toBeGreaterThan(0);
    expect(screen.getAllByText('History').length).toBeGreaterThan(0);
    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('shows the credit balance only for platform-key users', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'jane@fund.com',
        name: 'Jane',
        role: 'user',
        credits: 12,
        has_api_key: true,
        uses_platform_key: true,
      },
    });
    renderShell();
    expect(screen.getAllByText(/12/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/credits/i).length).toBeGreaterThan(0);
  });

  it('hides credits entirely for users running on their own key', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'jane@fund.com',
        name: 'Jane',
        role: 'user',
        credits: 12,
        has_api_key: true,
        api_key_last4: '1234',
        uses_platform_key: false,
      },
    });
    renderShell();
    expect(screen.queryByText(/credits left/i)).not.toBeInTheDocument();
    expect(screen.getByText(/unlimited runs/i)).toBeInTheDocument();
  });

  it('prompts a user without an API key to add one from the rail', () => {
    renderShell();
    expect(screen.getByText(/add your api key/i)).toBeInTheDocument();
  });

  it('shows the stored key state instead of the prompt once a key exists', () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'jane@fund.com',
        name: 'Jane',
        role: 'user',
        credits: 12,
        has_api_key: true,
        api_key_last4: '1234',
      },
    });
    renderShell();
    expect(screen.queryByText(/add your api key/i)).not.toBeInTheDocument();
    expect(screen.getByText(/1234/)).toBeInTheDocument();
    expect(screen.getByText(/unlimited runs/i)).toBeInTheDocument();
  });

  it('offers the admin section only to admins', () => {
    renderShell();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    useAuthStore.setState({
      user: { id: 'u2', email: 'admin@fund.com', role: 'admin', credits: 0 },
    });
    renderShell();
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
  });
});
