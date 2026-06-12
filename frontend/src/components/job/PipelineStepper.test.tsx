import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../theme';
import PipelineStepper from './PipelineStepper';
import type { StatusResponse } from '../../types';

const RUNNING: StatusResponse = {
  job_id: 'j1',
  status: 'running',
  current_stage: 4,
  stage_name: 'Conduct Risk Assessment',
  total_stages: 8,
  progress_pct: 43.8,
  error: null,
  resumable: false,
  paused_at: null,
  selected_stages: null,
};

function renderRail(statusData: StatusResponse | null) {
  return render(
    <ThemeProvider theme={theme}>
      <PipelineStepper statusData={statusData} />
    </ThemeProvider>,
  );
}

describe('PipelineStepper (agent rail)', () => {
  it('renders all eight stages of the rail', () => {
    renderRail(RUNNING);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(8);
    expect(screen.getByText('Company research')).toBeInTheDocument();
    expect(screen.getByText('Visual summary')).toBeInTheDocument();
  });

  it('marks completed, active, and queued stages distinctly', () => {
    renderRail(RUNNING);
    expect(screen.getByLabelText(/stage 1: company research — completed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stage 4: risk assessment — active/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stage 8: visual summary — queued/i)).toBeInTheDocument();
  });

  it('shows which engine is working the active stage and the progress', () => {
    renderRail(RUNNING);
    expect(screen.getByText(/sonnet \+ extended thinking/i)).toBeInTheDocument();
    expect(screen.getByText('43.8%')).toBeInTheDocument();
  });

  it('marks unselected stages as skipped for partial runs', () => {
    renderRail({ ...RUNNING, selected_stages: [1, 2, 6], current_stage: 2 });
    expect(screen.getByLabelText(/stage 3: financial model — skipped/i)).toBeInTheDocument();
  });
});
