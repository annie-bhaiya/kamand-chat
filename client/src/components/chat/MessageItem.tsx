'use client';

import React, { useState, useEffect } from 'react';
import { Message, ConversationMember, Attachment } from '@/types/chat';
import { Avatar } from '@/components/ui/Avatar';
import { formatTime, formatFileSize, getMemberProfile } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import {
  Smile,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  FileText,
  Download,
  Play,
  X,
  Save,
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  currentUserId: string;
  members: ConversationMember[];
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, body: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  members,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
}) => {
  const { error } = useToast();
  const isMe = message.sender_id === currentUserId;
  const isDeleted = !!message.deleted_at;

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
    } catch (err: any) {
      console.error('Failed to get attachment URL:', err);
    } finally {
      setLoadingUrls((prev) => ({ ...prev, [attachment.id]: false }));
    }
  };

  useEffect(() => {
    if (message.attachments && message.attachments.length > 0 && !isDeleted) {
      for (const att of message.attachments) {
        // Pre-fetch for images and audio
        if (att.mime_type.startsWith('image/') || att.mime_type.startsWith('audio/')) {
          fetchAttachmentUrl(att);
        }
      }
    }
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
    } catch (err: any) {
      error(err.message || 'Failed to edit message');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this message?')) {
      try {
        await onDeleteMessage(message.id);
      } catch (err: any) {
        error(err.message || 'Failed to delete message');
      }
    }
  };

  return (
    <div className={`message-row ${isMe ? 'sent' : 'received'}`}>
      {!isMe && (
        <Avatar name={senderName} src={senderAvatar} size="sm" />
      )}

      <div style={{ maxWidth: '100%' }}>
        <div className={`message-bubble ${isDeleted ? 'deleted' : ''}`}>
          {/* Sender name for received messages in group chats */}
          {!isMe && (
            <div className="message-sender-name">{senderName}</div>
          )}

          {/* Deleted tombstone */}
          {isDeleted ? (
            <div className="message-text">This message was deleted</div>
          ) : isEditing ? (
            <div style={{ minWidth: '220px' }}>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="composer-input"
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 8px',
                  color: 'white',
                }}
                rows={2}
              />
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-ghost"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="btn btn-primary"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
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
                              <img
                                src={url}
                                alt={att.original_name}
                                className="attachment-img-preview"
                              />
                            </a>
                          ) : (
                            <div
                              onClick={() => fetchAttachmentUrl(att)}
                              className="attachment-card"
                            >
                              <FileText size={18} color="#818cf8" />
                              <span>{att.original_name} (Click to load image)</span>
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
                      >
                        <FileText size={18} color="#818cf8" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {att.original_name}
                          </div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {formatFileSize(att.size_bytes)}
                          </div>
                        </div>
                        <Download size={14} color="#94a3b8" />
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
                  <CheckCheck size={13} color="#38bdf8" />
                ) : (
                  <Check size={13} color="rgba(255,255,255,0.7)" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Hover Action Menu */}
        {!isDeleted && (
          <div className="message-hover-actions">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onToggleReaction(message.id, emoji)}
                className="action-btn-mini"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}

            {isMe && (
              <>
                <button
                  onClick={() => {
                    setEditBody(message.body);
                    setIsEditing(true);
                  }}
                  className="action-btn-mini"
                  title="Edit message"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={handleDelete}
                  className="action-btn-mini"
                  style={{ color: 'var(--danger)' }}
                  title="Delete message"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Reaction Badges */}
        {reactionGroups.length > 0 && !isDeleted && (
          <div className="reactions-row">
            {reactionGroups.map((rg) => (
              <button
                key={rg.emoji}
                onClick={() => onToggleReaction(message.id, rg.emoji)}
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
