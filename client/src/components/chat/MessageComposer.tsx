'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { Attachment } from '@/types/chat';
import {
  Send,
  Paperclip,
  Smile,
  X,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

interface MessageComposerProps {
  conversationId: string;
  onSendMessage: (body: string, attachmentIds?: string[]) => Promise<any>;
  onSendTyping: (isTyping: boolean) => void;
}

const COMMON_EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '🎉', '❤️', '🙌', '✨', '🚀', '💯', '👏'];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  onSendMessage,
  onSendTyping,
}) => {
  const { error } = useToast();
  const [text, setText] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resize textarea automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    // Notify typing
    onSendTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      error('File is too large. Maximum size is 10 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.uploadAttachment(conversationId, file);
      if (res.data) {
        setDraftAttachments((prev) => [...prev, res.data]);
      }
    } catch (err: any) {
      error(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDraft = async (attachment: Attachment) => {
    try {
      await api.deleteDraftAttachment(attachment.id);
      setDraftAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    } catch {
      // If server error, still remove locally
      setDraftAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && draftAttachments.length === 0) return;
    if (isSending) return;

    setIsSending(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    onSendTyping(false);

    try {
      const attachmentIds = draftAttachments.map((a) => a.id);
      await onSendMessage(trimmed, attachmentIds);
      setText('');
      setDraftAttachments([]);
      setShowEmojiPicker(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err: any) {
      error(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="chat-composer-wrapper">
      {/* Uploaded draft attachments tray */}
      {draftAttachments.length > 0 && (
        <div className="composer-drafts">
          {draftAttachments.map((att) => (
            <div key={att.id} className="draft-pill">
              {att.mime_type.startsWith('image/') ? (
                <ImageIcon size={14} />
              ) : (
                <FileText size={14} />
              )}
              <span>{att.original_name}</span>
              <button
                onClick={() => handleRemoveDraft(att)}
                className="draft-remove"
                title="Remove attachment"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="emoji-popover">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-btn"
              onClick={() => insertEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="composer-box">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isSending}
          className="btn-icon btn-ghost"
          style={{ width: '32px', height: '32px' }}
          title="Upload file or image (up to 10MB)"
        >
          <Paperclip size={18} />
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isUploading ? 'Uploading file...' : 'Write a message... (Enter to send)'
          }
          className="composer-input"
          rows={1}
          disabled={isSending}
        />

        {/* Emoji trigger button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="btn-icon btn-ghost"
          style={{ width: '32px', height: '32px' }}
          title="Add emoji"
        >
          <Smile size={18} />
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={
            isSending ||
            isUploading ||
            (!text.trim() && draftAttachments.length === 0)
          }
          className="composer-btn-send"
          title="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
