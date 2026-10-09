import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { VisualSettingsProvider, useVisualSettings } from '../src/components/settings/VisualSettings';
function Opener() { const { openSettings } = useVisualSettings(); return <button onClick={openSettings}>Preferences</button>; }
it('applies and saves appearance, size, accent, density and motion settings', async () => {
  render(<VisualSettingsProvider><Opener /></VisualSettingsProvider>);
  fireEvent.click(screen.getByText('Preferences'));
  for (const label of ['Dark', 'Lake', 'Large', 'Compact']) fireEvent.click(screen.getByRole('button', { name: label }));
  fireEvent.click(screen.getByRole('switch'));
  await waitFor(() => expect(document.documentElement.dataset).toMatchObject({ theme: 'dark', accent: 'lake', textSize: 'large', density: 'compact', reduceMotion: 'true' }));
  expect(JSON.parse(localStorage.getItem('kamand-visual-settings')!)).toMatchObject({ appearance: 'dark', accent: 'lake', textSize: 'large', density: 'compact', reduceMotion: true });
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(document.documentElement.dataset.textSize).toBe('default');
});

