import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from '../theme';
import LandingPage from './LandingPage';

// The landing page warms the backend on mount; stub the API module so no
// network is hit. The sign-in dialog also imports auth calls from it.
vi.mock('../api/client', () => ({
  warmBackend: vi.fn().mockResolvedValue(true),
  loginApi: vi.fn(),
  register: vi.fn(),
  googleAuth: vi.fn(),
}));

function renderLanding(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider theme={theme}>
        <LandingPage />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('LandingPage', () => {
  it('shows the hero, the audience, and the eight-stage pipeline', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { name: /a company name in\.\s*an ic-ready memo out\./i }),
    ).toBeInTheDocument();
    // The pipeline section names the stages.
    expect(screen.getByText('Company research')).toBeInTheDocument();
    expect(screen.getByText('Visual summary')).toBeInTheDocument();
    // The audience section addresses the three buyer types.
    expect(screen.getByText(/micro vc/i)).toBeInTheDocument();
    expect(screen.getByText(/private equity/i)).toBeInTheDocument();
    expect(screen.getByText(/strategic buyers/i)).toBeInTheDocument();
  });

  it('opens the sign-in window on the same page when "Sign in" is clicked', () => {
    renderLanding();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^sign in$/i })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
  });

  it('opens the dialog on the create-account tab from the primary CTA', () => {
    renderLanding();
    fireEvent.click(screen.getAllByRole('button', { name: /create free account/i })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('opens the sign-in dialog automatically when routed with ?auth=signin', () => {
    renderLanding(['/?auth=signin']);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
