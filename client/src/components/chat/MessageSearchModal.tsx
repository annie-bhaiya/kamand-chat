'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { Message, ConversationMember } from '@/types/chat';
import { Search, FileText } from 'lucide-react';
import { formatTime, formatDateDivider } from '@/lib/utils';

interface MessageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  members: ConversationMember[];
}

export const MessageSearchModal: React.FC<MessageSearchModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  members,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.searchMessages(conversationId, query.trim());
        if (res.data) {
          setResults(res.data);
        }
      } catch (err: any) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen, conversationId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search Messages"
      description="Search within this conversation's history"
      maxWidth={520}
    >
      <div>
        <div className="search-box" style={{ marginBottom: '16px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Type words to search..."
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isSearching ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Searching history...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              {query ? 'No matching messages found.' : 'Enter search terms above.'}
            </div>
          ) : (
            results.map((msg) => {
              const sender = members.find((m) => m.user_id === msg.sender_id);
              const senderName =
                sender?.profiles?.display_name ||
                sender?.profiles?.username ||
                'User';

              return (
                <div
                  key={msg.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#818cf8' }}>
                      {senderName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formatDateDivider(msg.created_at)} at {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                    {msg.body}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
