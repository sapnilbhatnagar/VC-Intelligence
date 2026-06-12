import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from '../../theme';
import AuthDialog from './AuthDialog';

const registerMock = vi.fn().mockResolvedValue({
  access_token: 't',
  user_id: 'u1',
  email: 'jane@fund.com',
  role: 'user',
  credits: 5,
  has_api_key: true,
  api_key_last4: '1234',
  llm_provider: 'openai',
  llm_effort: 'high',
});

vi.mock('../../api/client', () => ({
  loginApi: vi.fn(),
  register: (...args: unknown[]) => registerMock(...args),
}));

function renderDialog(mode: 'signin' | 'register') {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <AuthDialog open mode={mode} onClose={() => {}} />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('AuthDialog', () => {
  it('does not offer Google sign-in (hidden for now)', () => {
    renderDialog('signin');
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
  });

  it('onboarding asks for provider, API key, and effort level', () => {
    renderDialog('register');
    expect(screen.getByLabelText(/api provider/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^api key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/analysis effort/i)).toBeInTheDocument();
    // The key is mandatory; its field is required and never labeled optional.
    expect(screen.getByLabelText(/^api key/i)).toBeRequired();
    expect(screen.queryByLabelText(/api key.*optional/i)).not.toBeInTheDocument();
  });

  it('blocks registration without an API key', async () => {
    registerMock.mockClear();
    renderDialog('register');
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@fund.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText(/api key is required/i)).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('submits provider, key, and effort with the registration', async () => {
    registerMock.mockClear();
    renderDialog('register');
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@fund.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret123' },
    });
    fireEvent.mouseDown(screen.getByLabelText(/api provider/i));
    fireEvent.click(await screen.findByRole('option', { name: /openai/i }));
    fireEvent.change(screen.getByLabelText(/^api key/i), {
      target: { value: 'sk-proj-test-key-abcdefgh1234' },
    });
    fireEvent.mouseDown(screen.getByLabelText(/analysis effort/i));
    fireEvent.click(await screen.findByRole('option', { name: /high/i }));
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(registerMock).toHaveBeenCalled());
    expect(registerMock).toHaveBeenCalledWith(
      'jane@fund.com',
      'secret123',
      undefined,
      undefined,
      'sk-proj-test-key-abcdefgh1234',
      'openai',
      'high',
    );
  });
});
