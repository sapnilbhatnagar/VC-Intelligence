import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../theme';
import Dashboard from './Dashboard';
import type { HistoryItem } from '../types';

vi.mock('../api/client', () => ({
  getHistory: vi.fn().mockResolvedValue([
    {
      job_id: 'a1',
      company_input: 'Northbeam Robotics',
      status: 'completed',
      current_stage: 8,
      recommendation: 'BUY',
      risk_score: 4.2,
      created_at: '2026-06-01T10:00:00Z',
      completed_at: '2026-06-01T10:12:00Z',
    },
    {
      job_id: 'a2',
      company_input: 'Quietloop Systems',
      status: 'completed',
      current_stage: 8,
      recommendation: 'PASS',
      risk_score: 7.8,
      created_at: '2026-06-03T10:00:00Z',
      completed_at: '2026-06-03T10:14:00Z',
    },
    {
      job_id: 'a3',
      company_input: 'Fernwave',
      status: 'running',
      current_stage: 4,
      recommendation: null,
      risk_score: null,
      created_at: '2026-06-12T09:00:00Z',
      completed_at: null,
    },
  ] satisfies HistoryItem[]),
  startAnalysis: vi.fn(),
  listApiKeys: vi.fn().mockResolvedValue([]),
}));

function renderDashboard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={qc}>
          <Dashboard />
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Dashboard (deal desk)', () => {
  it('shows the desk KPIs computed from history', async () => {
    renderDashboard();
    expect(await screen.findByText('Companies analyzed')).toBeInTheDocument();
    expect(screen.getByText('Buy signals')).toBeInTheDocument();
    expect(screen.getByText('Median risk')).toBeInTheDocument();
    expect(screen.getByText('In pipeline')).toBeInTheDocument();
    // 3 companies, 1 buy signal, median risk 6.0, 1 active run.
    expect(await screen.findByText('6.0')).toBeInTheDocument();
  });

  it('lists recent analyses in the deal flow with verdicts and risk', async () => {
    renderDashboard();
    expect(await screen.findByText('Northbeam Robotics')).toBeInTheDocument();
    expect(screen.getByText('Quietloop Systems')).toBeInTheDocument();
    expect(screen.getByText('BUY')).toBeInTheDocument();
    expect(screen.getByText('PASS')).toBeInTheDocument();
    expect(screen.getByText('Deal flow')).toBeInTheDocument();
  });

  it('shows the running job in pipeline activity with its stage', async () => {
    renderDashboard();
    // Fernwave appears in deal flow AND pipeline activity.
    const mentions = await screen.findAllByText('Fernwave');
    expect(mentions.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/stage 4 of 8/i)).toBeInTheDocument();
  });

  it('hosts the new-analysis form on the desk', async () => {
    renderDashboard();
    expect(await screen.findByLabelText('Company name or website')).toBeInTheDocument();
  });
});
