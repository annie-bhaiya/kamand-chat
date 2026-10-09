'use client';

import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { formatFileSize,formatTime,getMemberProfile } from '@/lib/utils';
import { Attachment,ConversationMember,Message,Profile } from '@/types/chat';
import {
  Check,
  CheckCheck,
  Copy,
  Download,
  Edit2,
  FileText,
  MoreHorizontal,
  Save,
  Trash2,
  X
} from 'lucide-react';
import Image from 'next/image';
import React,{ useEffect,useId,useRef,useState } from 'react';

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  members: ConversationMember[];
  isConsecutive?: boolean;
  onToggleReaction: (messageId: string, emoji: string) => Promise<void>;
  onEditMessage: (messageId: string, body: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onOpenUserProfile?: (userId: string, profile?: Partial<Profile> | null) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  members,
  isConsecutive = false,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
  onOpenUserProfile,
}) => {
  const { error, success } = useToast();
  const isMe = message.sender_id === currentUserId;
  const isDeleted = !!message.deleted_at;

  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsId = useId();
  const actionsTrigger = useRef<HTMLButtonElement>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  }, []);

  // Close actions menu when clicking outside on desktop
  useEffect(() => {
    if (!actionsOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        actionsTrigger.current &&
        !actionsTrigger.current.contains(e.target as Node)
      ) {
        const menuEl = document.getElementById(actionsId);
        if (menuEl && !menuEl.contains(e.target as Node)) {
          setActionsOpen(false);
        }
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setActionsOpen(false);
        actionsTrigger.current?.focus();
      }
      if (event.key === 'Tab' && window.matchMedia('(max-width: 768px)').matches) {
        const buttons = Array.from(document.getElementById(actionsId)?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
        const first = buttons[0];
        const last = buttons.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === actionsTrigger.current)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === actionsTrigger.current)) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [actionsOpen, actionsId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleted || isEditing) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressRef.current = false;

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setActionsOpen(true);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(35); } catch {}
      }
    }, 450);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    setTimeout(() => {
      isLongPressRef.current = false;
    }, 150);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isDeleted || isEditing) return;
    e.preventDefault();
    setActionsOpen(true);
  };

  const handleCopy = async () => {
    if (!message.body) return;
    try {
      await navigator.clipboard.writeText(message.body);
      success('Copied to clipboard');
    } catch {
      error('Failed to copy message');
    }
  };
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});

  // Sender profile
  const senderMember = members.find((m) => m.user_id === message.sender_id);
  const senderProfile = getMemberProfile(senderMember);
  const senderName =
    senderProfile?.display_name ||
    senderProfile?.username ||
    'Student';
  const senderAvatar = senderProfile?.avatar_key;

  // Determine read status: did any other active member read past this message's seq?
  const isReadByOthers = members.some(
    (m) => m.user_id !== currentUserId && !m.left_at && m.last_read_seq >= message.seq
  );

  // Load signed URLs for attachments
  const fetchAttachmentUrl = async (attachment: Attachment) => {
    if (signedUrls[attachment.id] || loadingUrls[attachment.id]) return;

    setLoadingUrls((prev) => ({ ...prev, [attachment.id]: true }));
    try {
      const res = await api.getAttachmentUrl(attachment.id);
      if (res.data?.signedUrl) {
        setSignedUrls((prev) => ({ ...prev, [attachment.id]: res.data.signedUrl }));
      }
    } catch (err: unknown) {
      console.error('Failed to get attachment URL:', err);
    } finally {
      setLoadingUrls((prev) => ({ ...prev, [attachment.id]: false }));
    }
  };

  useEffect(() => {
    let active = true;
    if (!isDeleted) {
      for (const attachment of message.attachments || []) {
        if (!/^(image|audio)\//.test(attachment.mime_type)) continue;
        api.getAttachmentUrl(attachment.id).then(res => {
          if (active && res.data?.signedUrl) setSignedUrls(previous => ({ ...previous, [attachment.id]: res.data.signedUrl }));
        }).catch(() => {});
      }
    }
    return () => { active = false; };
  }, [message.attachments, isDeleted]);

  // Aggregate reactions: emoji -> { count, hasReacted }
  const reactionGroups: { emoji: string; count: number; hasReacted: boolean }[] = [];
  if (message.message_reactions && message.message_reactions.length > 0) {
    const map = new Map<string, { count: number; hasReacted: boolean }>();
    for (const r of message.message_reactions) {
      const existing = map.get(r.emoji) || { count: 0, hasReacted: false };
      existing.count += 1;
      if (r.user_id === currentUserId) {
        existing.hasReacted = true;
      }
      map.set(r.emoji, existing);
    }
    map.forEach((val, emoji) => {
      reactionGroups.push({ emoji, count: val.count, hasReacted: val.hasReacted });
    });
  }

  const handleSaveEdit = async () => {
    if (!editBody.trim()) {
      error('Message text cannot be empty');
      return;
    }
    setIsSavingEdit(true);
    try {
      await onEditMessage(message.id, editBody.trim());
      setIsEditing(false);
    } catch (err: unknown) {
      error((err instanceof Error ? err.message : '') || 'Failed to edit message');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this message?')) {
      try {
        await onDeleteMessage(message.id);
      } catch (err: unknown) {
        error((err instanceof Error ? err.message : '') || 'Failed to delete message');
      }
    }
  };

  const handleReaction = async (emoji: string) => {
    try { await onToggleReaction(message.id, emoji); }
    catch (err) { error(err instanceof Error ? err.message : 'Could not update reaction.'); }
  };

  return (
    <div
      className={`message-row ${isMe ? 'sent' : 'received'} ${isConsecutive ? 'consecutive' : ''} ${actionsOpen ? 'actions-open' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && actionsOpen) {
          event.stopPropagation();
          setActionsOpen(false);
          actionsTrigger.current?.focus();
        }
      }}
    >
      {!isMe && (
        isConsecutive ? (
          <div className="message-avatar-spacer" aria-hidden="true" />
        ) : (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenUserProfile?.(message.sender_id, senderProfile); }
            }}
            onClick={() => onOpenUserProfile?.(message.sender_id, senderProfile)}
            style={{ cursor: 'pointer' }}
            title={`View ${senderName}'s profile`}
          >
            <Avatar name={senderName} src={senderAvatar} size="sm" />
          </div>
        )
      )}

      <div className="message-content-wrapper" >
        <div
          className={`message-bubble ${isDeleted ? 'deleted' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onContextMenu={handleContextMenu}
          onClick={(e) => {
            if (isLongPressRef.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {/* Sender name for received messages in group chats */}
          {!isMe && !isConsecutive && (
            <div
              className="message-sender-name"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenUserProfile?.(message.sender_id, senderProfile); }
              }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenUserProfile?.(message.sender_id, senderProfile);
              }}
              style={{ cursor: 'pointer' }}
              title={`View ${senderName}'s profile`}
            >
              {senderName}
            </div>
          )}

          {/* Deleted tombstone */}
          {isDeleted ? (
            <div className="message-text">This message was deleted</div>
          ) : isEditing ? (
            <div className="message-edit">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                aria-label="Edit message"
                className="input-control message-edit-input"
                rows={2}
              />
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="btn btn-primary"
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  <Save size={12} />
                  {isSavingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Message text */}
              {message.body && (
                <div className="message-text">{message.body}</div>
              )}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {message.attachments.map((att) => {
                    const isImage = att.mime_type.startsWith('image/');
                    const isAudio = att.mime_type.startsWith('audio/');
                    const url = signedUrls[att.id];

                    if (isImage) {
                      return (
                        <div key={att.id} style={{ position: 'relative' }}>
                          {url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <Image unoptimized width={320} height={260}
                                src={url}
                                alt={att.original_name}
                                className="attachment-img-preview"
                              />
                            </a>
                          ) : (
                            <div
                              onClick={() => fetchAttachmentUrl(att)}
                              className="attachment-card"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  void fetchAttachmentUrl(att);
                                }
                              }}
                            >
                              <FileText size={18} className="attachment-icon" />
                              <span className="attachment-filename">{att.original_name} (Click to load image)</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    if (isAudio && url) {
                      return (
                        <div key={att.id} style={{ marginTop: '4px' }}>
                          <audio controls src={url} style={{ maxWidth: '240px', height: '36px' }} />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={att.id}
                        onClick={async () => {
                          if (url) {
                            window.open(url, '_blank');
                          } else {
                            await fetchAttachmentUrl(att);
                          }
                        }}
                        className="attachment-card"
                        role="button"
                        tabIndex={0}
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (url) window.open(url, '_blank');
                            else await fetchAttachmentUrl(att);
                          }
                        }}
                      >
                        <FileText size={18} className="attachment-icon" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="attachment-filename">
                            {att.original_name}
                          </div>
                          <div className="attachment-filesize">
                            {formatFileSize(att.size_bytes)}
                          </div>
                        </div>
                        <Download size={15} className="attachment-download-icon" />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Message Meta (time, edited, read checkmarks) */}
          <div className="message-meta">
            {message.edited_at && !isDeleted && (
              <span className="message-edited-tag">edited</span>
            )}
            <span>{formatTime(message.created_at)}</span>
            {isMe && !isDeleted && (
              <span title={isReadByOthers ? 'Read' : 'Sent'}>
                {isReadByOthers ? (
                  <CheckCheck size={13} color="currentColor" />
                ) : (
                  <Check size={13} color="currentColor" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Hover Action Menu */}
        {!isDeleted && !isEditing && (
          <>
            <button
              ref={actionsTrigger}
              className="message-actions-trigger"
              aria-label="Message actions"
              aria-expanded={actionsOpen}
              aria-controls={actionsId}
              onClick={() => setActionsOpen(!actionsOpen)}
              type="button"
            >
              <MoreHorizontal size={18} />
            </button>

            {actionsOpen && (
              <div
                className="message-actions-backdrop"
                onClick={() => setActionsOpen(false)}
                aria-hidden="true"
              />
            )}

            <div
              id={actionsId}
              className={`message-hover-actions ${actionsOpen ? 'open' : ''}`}
              role="group"
              aria-label="Message actions"
            >
              <div className="message-actions-emojis">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      void handleReaction(emoji);
                      setActionsOpen(false);
                    }}
                    className="action-btn-mini"
                    title={`React with ${emoji}`}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <div className="message-actions-tools">
                {message.body && (
                  <button
                    onClick={() => {
                      setActionsOpen(false);
                      void handleCopy();
                    }}
                    className="action-btn-mini"
                    title="Copy message"
                    type="button"
                  >
                    <Copy size={13} />
                    <span className="action-btn-label">Copy</span>
                  </button>
                )}
                {isMe && (
                  <>
                    <button
                      onClick={() => {
                        setActionsOpen(false);
                        setEditBody(message.body);
                        setIsEditing(true);
                      }}
                      className="action-btn-mini"
                      title="Edit message"
                      type="button"
                    >
                      <Edit2 size={13} />
                      <span className="action-btn-label">Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setActionsOpen(false);
                        void handleDelete();
                      }}
                      className="action-btn-mini action-btn-danger"
                      title="Delete message"
                      type="button"
                    >
                      <Trash2 size={13} />
                      <span className="action-btn-label">Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Reaction Badges */}
        {reactionGroups.length > 0 && !isDeleted && (
          <div className="reactions-row">
            {reactionGroups.map((rg) => (
              <button
                key={rg.emoji}
                onClick={() => handleReaction(rg.emoji)}
                className={`reaction-pill ${rg.hasReacted ? 'active' : ''}`}
                title={`Reacted by ${rg.count} user(s)`}
              >
                <span>{rg.emoji}</span>
                <span className="reaction-count">{rg.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
