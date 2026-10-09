import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageComposer } from '../src/components/chat/MessageComposer';
import { ToastProvider } from '../src/components/ui/Toast';
import { api } from '../src/lib/api';

describe('message composer', () => {
  it('blocks keyboard submission while a file is uploading', async () => {
    let complete!: (value: Awaited<ReturnType<typeof api.uploadAttachment>>) => void;
    vi.spyOn(api, 'uploadAttachment').mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const send = vi.fn().mockResolvedValue({});
    const { container } = render(<ToastProvider><MessageComposer conversationId="room" onSendMessage={send} onSendTyping={vi.fn()} /></ToastProvider>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Hello' } });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['data'], 'notes.txt')] } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Message' }), { key: 'Enter' });
    expect(send).not.toHaveBeenCalled();
    await act(async () => complete({ data: { id: 'draft', mime_type: 'text/plain', original_name: 'notes.txt' } as never }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Message' }), { key: 'Enter' });
    await waitFor(() => expect(send).toHaveBeenCalledWith('Hello', ['draft']));
  });
  it('preserves text on send failure and does not submit an IME composition', async () => {
    const send = vi.fn().mockRejectedValue(new Error('Connection lost'));
    render(<ToastProvider><MessageComposer conversationId="room" onSendMessage={send} onSendTyping={vi.fn()} /></ToastProvider>);
    const input = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.change(input, { target: { value: 'My draft' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(send).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('Connection lost');
    expect((input as HTMLTextAreaElement).value).toBe('My draft');
  });
  it('dismisses emoji choices with Escape, restores focus, and dismisses outside clicks', () => {
    render(<ToastProvider><MessageComposer conversationId="room" onSendMessage={vi.fn()} onSendTyping={vi.fn()} /></ToastProvider>);
    const trigger = screen.getByRole('button', { name: 'Add emoji' });
    fireEvent.click(trigger);
    expect(screen.getByRole('group', { name: 'Choose an emoji' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: 'Choose an emoji' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('textbox', { name: 'Message' }));
    expect(screen.queryByRole('group', { name: 'Choose an emoji' })).toBeNull();
  });
  it('exposes sending feedback and prevents emoji input while a message is pending', async () => {
    let complete!: () => void;
    const send = vi.fn(() => new Promise<void>(resolve => { complete = resolve; }));
    render(<ToastProvider><MessageComposer conversationId="room" onSendMessage={send} onSendTyping={vi.fn()} /></ToastProvider>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByRole('button', { name: 'Sending message' }).getAttribute('aria-busy')).toBe('true');
    expect((screen.getByRole('button', { name: 'Add emoji' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => complete());
    expect(screen.getByRole('button', { name: 'Send message' }).getAttribute('aria-busy')).toBe('false');
  });

});
