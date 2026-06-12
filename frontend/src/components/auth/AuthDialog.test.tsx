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
});

vi.mock('../../api/client', () => ({
  loginApi: vi.fn(),
  register: (...args: unknown[]) => registerMock(...args),
  googleAuth: vi.fn(),
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
    expect(screen.queryByText(/^or$/i)).not.toBeInTheDocument();
  });

  it('asks for an optional Claude API key during onboarding', () => {
    renderDialog('register');
    expect(screen.getByLabelText(/claude api key/i)).toBeInTheDocument();
    expect(screen.getByText(/unlimited, self-billed/i)).toBeInTheDocument();
  });

  it('submits the API key with the registration', async () => {
    renderDialog('register');
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'jane@fund.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByLabelText(/claude api key/i), {
      target: { value: 'sk-ant-test-key-abcdefgh1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(registerMock).toHaveBeenCalled());
    expect(registerMock).toHaveBeenCalledWith(
      'jane@fund.com',
      'secret123',
      undefined,
      undefined,
      'sk-ant-test-key-abcdefgh1234',
    );
  });

  it('registers without a key when the field is left empty', async () => {
    registerMock.mockClear();
    renderDialog('register');
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'sam@fund.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(registerMock).toHaveBeenCalled());
    expect(registerMock).toHaveBeenCalledWith('sam@fund.com', 'secret123', undefined, undefined, undefined);
  });
});
