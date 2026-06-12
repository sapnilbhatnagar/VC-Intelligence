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

  it('shows the credit balance for a signed-in user', () => {
    renderShell();
    expect(screen.getAllByText(/12/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/credits/i).length).toBeGreaterThan(0);
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
