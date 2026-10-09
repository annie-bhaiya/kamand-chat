'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ConversationMember, Message } from '@/types/chat';
import { Avatar } from '@/components/ui/Avatar';
import { formatTimeAgo } from '@/lib/utils';
import { Search, X, Loader2, FileText } from 'lucide-react';

interface EmbeddedChatSearchProps {
  conversationId: string;
  members: ConversationMember[];
  onSelectMessage?: (message: Message) => void;
}

export const EmbeddedChatSearch: React.FC<EmbeddedChatSearchProps> = ({
  conversationId,
  members,
  onSelectMessage,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchMessages(conversationId, query.trim());
        if (active && res.data) {
          setResults(res.data);
          setSearchError('');
        }
      } catch (err: unknown) {
        if (active) setSearchError(err instanceof Error ? err.message : 'Search failed. Try again.');
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, conversationId]);

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark
          key={i}
          style={{
            backgroundColor: 'var(--warning-light)',
            color: 'var(--warning)',
            padding: '1px 3px',
            borderRadius: '3px',
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Search Input Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          padding: '8px 12px',
        }}
      >
        <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          aria-label="Search messages in this chat"
          onChange={(e) => {
            setQuery(e.target.value);
            setResults([]);
            setSearchError('');
            setIsSearching(Boolean(e.target.value.trim()));
          }}
          placeholder="Search words, phrases, or topics..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.867rem',
            width: '100%',
          }}
          autoFocus
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setQuery(''); setResults([]); setSearchError(''); setIsSearching(false); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '2px',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Results Header */}
      {query.trim() && !isSearching && (
        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', paddingLeft: '2px' }}>
          {results.length === 1 ? '1 matching message' : `${results.length} matching messages`}
        </div>
      )}

      {/* Search Results List */}
      <div
        style={{
          maxHeight: '340px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '2px',
        }}
      >
        {isSearching ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <span style={{ fontSize: '0.82rem' }}>Searching messages...</span>
          </div>
        ) : !query.trim() ? (
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-subtle)',
            }}
          >
            <Search size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Search in this chat
            </p>
            <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>
              Find past messages, notes, and references instantly.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
            {searchError || 'No messages match your search term.'}
          </div>
        ) : (
          results.map((msg) => {
            const sender = members.find((m) => m.user_id === msg.sender_id);
            const senderName =
              sender?.profiles?.display_name ||
              sender?.profiles?.username ||
              'User';
            const senderAvatar = sender?.profiles?.avatar_key;

            return (
              <div
                key={msg.id}
                onClick={() => onSelectMessage?.(msg)}
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: onSelectMessage ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (onSelectMessage) e.currentTarget.style.background = 'var(--bg-glass-hover)';
                }}
                onMouseLeave={(e) => {
                  if (onSelectMessage) e.currentTarget.style.background = 'var(--bg-tertiary)';
                }}
              >
                <Avatar name={senderName} src={senderAvatar} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '3px',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {senderName}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {formatTimeAgo(msg.created_at)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      lineHeight: '1.35',
                      color: 'var(--text-secondary)',
                      wordBreak: 'break-word',
                    }}
                  >
                    {highlightMatch(msg.body, query)}
                  </div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '6px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary)',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <FileText size={12} />
                      <span>{msg.attachments.length} attachment(s)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
