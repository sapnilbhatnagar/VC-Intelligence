import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from '../theme';
import LandingPage from './LandingPage';

// The landing page warms the backend on mount; stub it so no network is hit.
vi.mock('../api/client', () => ({
  warmBackend: vi.fn().mockResolvedValue(true),
}));

describe('LandingPage', () => {
  it('mounts without crashing and shows the hero + primary CTAs', () => {
    render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <LandingPage />
        </ThemeProvider>
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/diligence that reads like your best analyst wrote it/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /start free/i }).length).toBeGreaterThan(0);
    // The eight pipeline stages each render as an outcome tile.
    expect(screen.getByText('Company research')).toBeInTheDocument();
    expect(screen.getByText('Visual summary')).toBeInTheDocument();
  });
});
