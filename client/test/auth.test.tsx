import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import Home from '@/app/page';
import { api } from '@/lib/api';

afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, '', '/'); });

function mockApi() {
  vi.spyOn(api, 'checkHealth').mockResolvedValue({ status: 'ok' });
  vi.spyOn(api, 'getAccessToken').mockReturnValue(null);
}

it('sends recovery email for the institute roll without requiring a password', async () => {
  mockApi();
  const send = vi.spyOn(api, 'forgotPassword').mockResolvedValue({ data: { message: 'Sent' } });
  render(<Home />);
  fireEvent.change(await screen.findByLabelText('Roll number'), { target: { value: 'B26001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
  expect(screen.queryByLabelText('Password')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  await screen.findByText(/If an account exists/);
  expect(send).toHaveBeenCalledWith('b26001@students.iitmandi.ac.in');
});

it('opens recovery over a saved session, clears the URL and checks matching passwords', async () => {
  mockApi();
  vi.spyOn(api, 'getAccessToken').mockReturnValue('old-session');
  const me = vi.spyOn(api, 'getMe');
  const reset = vi.spyOn(api, 'resetPassword').mockResolvedValue({ data: null });
  window.history.replaceState(null, '', '/#type=recovery&access_token=recovery-token&refresh_token=recovery-refresh');
  render(<Home />);
  await screen.findByLabelText('New password');
  expect(window.location.hash).toBe('');
  expect(me).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'StrongPass123!' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'DifferentPass123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'The passwords do not match.');
  expect(reset).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'StrongPass123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  await screen.findByText(/Your password has been updated/);
  expect(reset).toHaveBeenCalledWith('StrongPass123!', { access_token: 'recovery-token', refresh_token: 'recovery-refresh' });
});

it('shows expired-link feedback and allows requesting another link', async () => {
  mockApi();
  window.history.replaceState(null, '', '/#error=access_denied&error_code=otp_expired');
  render(<Home />);
  expect((await screen.findByRole('alert')).textContent).toContain('expired');
  expect((screen.getByRole('button', { name: 'Update password' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Request a new link' }));
  expect(screen.getByLabelText('Roll number')).toBeTruthy();
});
