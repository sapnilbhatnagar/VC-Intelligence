import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../theme';
import AnalysisForm from './AnalysisForm';

// The form calls the API on submit; stub it so no network is hit.
vi.mock('../../api/client', () => ({
  startAnalysis: vi.fn().mockResolvedValue({ job_id: 'test-job' }),
}));

function renderForm() {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <AnalysisForm />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('AnalysisForm', () => {
  it('renders the research input and primary action', () => {
    renderForm();
    expect(screen.getByLabelText('Company name or website')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start analysis/i })).toBeInTheDocument();
  });

  it('shows the full-run cost by default and updates it when the scope changes', () => {
    renderForm();
    // Full analysis is selected by default → 5 credits.
    expect(screen.getAllByText('5 credits').length).toBeGreaterThan(0);

    // Switching to Quick Screen recomputes the cost to 1 credit.
    fireEvent.click(screen.getByRole('radio', { name: /quick screen/i }));
    expect(screen.getAllByText('1 credit').length).toBeGreaterThan(0);
  });

  it('blocks submission and surfaces an error when the company is empty', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /start analysis/i }));
    expect(screen.getByText('Company name is required')).toBeInTheDocument();
  });
});
