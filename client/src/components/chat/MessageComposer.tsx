'use client';

import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { Attachment } from '@/types/chat';
import {
FileText,
LoaderCircle,
Image as ImageIcon,
Paperclip,
Send,
Smile,
X,
} from 'lucide-react';
import React,{ useEffect,useRef,useState } from 'react';

interface MessageComposerProps {
  conversationId: string;
  onSendMessage: (body: string, attachmentIds?: string[]) => Promise<unknown>;
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

  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, []);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const dismiss = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node) && !emojiTriggerRef.current?.contains(event.target as Node)) setShowEmojiPicker(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setShowEmojiPicker(false); emojiTriggerRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [showEmojiPicker]);

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
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
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
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'File upload failed');
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
    if (isSending || isUploading) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    onSendTyping(false);

    const savedText = text;
    const savedDrafts = [...draftAttachments];
    const attachmentIds = draftAttachments.map((a) => a.id);

    // Optimistically clear composer inputs immediately
    setText('');
    setDraftAttachments([]);
    setShowEmojiPicker(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsSending(true);
    try {
      await onSendMessage(trimmed, attachmentIds);
    } catch (err: unknown) {
      // Restore input on failure so text/drafts are not lost
      setText(savedText);
      setDraftAttachments(savedDrafts);
      error((err instanceof Error ? err.message : '') || 'Failed to send message');
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
                <ImageIcon size={14} className="draft-icon" />
              ) : (
                <FileText size={14} className="draft-icon" />
              )}
              <span className="draft-filename">{att.original_name}</span>
              <button
                onClick={() => handleRemoveDraft(att)}
                className="draft-remove"
                aria-label={`Remove ${att.original_name}`}
                title="Remove attachment"
                type="button"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div ref={pickerRef} id="composer-emoji-picker" className="emoji-popover" role="group" aria-label="Choose an emoji">
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
          className="btn-icon btn-tonal"
          data-tone="learning"
          aria-label={isUploading ? "Uploading attachment" : "Attach file or image"}
          aria-busy={isUploading}
          title="Upload file or image (up to 10MB)"
        >
          {isUploading ? <LoaderCircle size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </button>

        {/* Text input */}
        <textarea
          aria-label="Message"
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isUploading ? 'Uploading file...' : 'Write a message...'
          }
          className="composer-input"
          title="Enter to send · Shift+Enter for a new line"
          rows={1}
          disabled={isSending}
        />

        {/* Emoji trigger button */}
        <button
          type="button"
          ref={emojiTriggerRef}
          disabled={isSending}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="btn-icon btn-tonal"
          data-tone="dining"
          aria-controls="composer-emoji-picker"
          aria-label="Add emoji"
          aria-expanded={showEmojiPicker}
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
          aria-label={isSending ? "Sending message" : "Send message"}
          aria-busy={isSending}
          title="Send message"
        >
          {isSending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};
