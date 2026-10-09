'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { Attachment } from '@/types/chat';
import { formatFileSize, formatTimeAgo } from '@/lib/utils';
import { Download, FileText, Film, Music, Image as ImageIcon, Loader2 } from 'lucide-react';

interface EmbeddedAttachmentsGridProps {
  conversationId: string;
}

export const EmbeddedAttachmentsGrid: React.FC<EmbeddedAttachmentsGridProps> = ({
  conversationId,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'media' | 'docs'>('all');
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    async function loadAttachments() {
      setLoading(true);
      try {
        const res = await api.getConversationAttachments(conversationId);
        if (active && res.data) {
          setAttachments(res.data);
          // Pre-fetch signed URLs for the first 12 image attachments
          const imageAtts = res.data.filter((a) => a.mime_type.startsWith('image/')).slice(0, 12);
          for (const att of imageAtts) {
            api.getAttachmentUrl(att.id).then(response => {
              if (active && response.data?.signedUrl) {
                setSignedUrls(previous => ({ ...previous, [att.id]: response.data.signedUrl }));
              }
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Failed to load conversation attachments:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAttachments();
    return () => {
      active = false;
    };
  }, [conversationId]);

  const fetchUrl = async (attachmentId: string): Promise<string | null> => {
    if (signedUrls[attachmentId]) return signedUrls[attachmentId];
    if (loadingUrls[attachmentId]) return null;

    setLoadingUrls((prev) => ({ ...prev, [attachmentId]: true }));
    try {
      const res = await api.getAttachmentUrl(attachmentId);
      if (res.data?.signedUrl) {
        setSignedUrls((prev) => ({ ...prev, [attachmentId]: res.data.signedUrl }));
        return res.data.signedUrl;
      }
    } catch (err) {
      console.error('Failed to load attachment URL:', err);
    } finally {
      setLoadingUrls((prev) => ({ ...prev, [attachmentId]: false }));
    }
    return null;
  };

  const handleOpenAttachment = async (att: Attachment) => {
    const url = await fetchUrl(att.id);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const mediaItems = attachments.filter(
    (a) => a.mime_type.startsWith('image/') || a.mime_type.startsWith('video/')
  );
  const docItems = attachments.filter(
    (a) => !a.mime_type.startsWith('image/') && !a.mime_type.startsWith('video/')
  );

  const displayedItems =
    activeTab === 'media' ? mediaItems : activeTab === 'docs' ? docItems : attachments;

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('audio/')) return <Music size={20} className="text-emerald-400" />;
    if (mime.startsWith('video/')) return <Film size={20} className="text-purple-400" />;
    if (mime.startsWith('image/')) return <ImageIcon size={20} className="text-blue-400" />;
    return <FileText size={20} className="text-amber-400" />;
  };

  if (loading) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
        <span style={{ fontSize: '0.867rem' }}>Loading attachments...</span>
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div
        style={{
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-subtle)',
        }}
      >
        <ImageIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          No attachments yet
        </p>
        <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          Photos, videos, and documents shared in this chat will appear here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Category Pills */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`btn-filter ${activeTab === 'all' ? 'active' : ''}`}
          style={{
            padding: '5px 12px',
            fontSize: '0.78rem',
            borderRadius: '20px',
            border: activeTab === 'all' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
            background: activeTab === 'all' ? 'var(--accent-light)' : 'transparent',
            color: activeTab === 'all' ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          All ({attachments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`btn-filter ${activeTab === 'media' ? 'active' : ''}`}
          style={{
            padding: '5px 12px',
            fontSize: '0.78rem',
            borderRadius: '20px',
            border: activeTab === 'media' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
            background: activeTab === 'media' ? 'var(--accent-light)' : 'transparent',
            color: activeTab === 'media' ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Media ({mediaItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('docs')}
          className={`btn-filter ${activeTab === 'docs' ? 'active' : ''}`}
          style={{
            padding: '5px 12px',
            fontSize: '0.78rem',
            borderRadius: '20px',
            border: activeTab === 'docs' ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
            background: activeTab === 'docs' ? 'var(--accent-light)' : 'transparent',
            color: activeTab === 'docs' ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Files ({docItems.length})
        </button>
      </div>

      {/* Grid Display */}
      <div
        style={{
          maxHeight: '340px',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        {displayedItems.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No {activeTab === 'media' ? 'photos or videos' : 'files'} found in this chat.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: activeTab === 'media' ? 'repeat(auto-fill, minmax(96px, 1fr))' : 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '10px',
            }}
          >
            {displayedItems.map((att) => {
              const isImage = att.mime_type.startsWith('image/');
              const url = signedUrls[att.id];
              const isLoadingThis = loadingUrls[att.id];

              if (isImage) {
                return (
                  <div
                    key={att.id}
                    onClick={() => void handleOpenAttachment(att)}
                    title={`${att.original_name} (${formatFileSize(att.size_bytes)})`}
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '1 / 1',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      transition: 'transform 0.15s ease, border-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.03)';
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                  >
                    {url ? (
                      <Image
                        unoptimized
                        src={url}
                        alt={att.original_name}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {isLoadingThis ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <ImageIcon size={22} opacity={0.6} />
                        )}
                      </div>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                        padding: '12px 6px 4px',
                        fontSize: '0.68rem',
                        color: 'white',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatFileSize(att.size_bytes)}
                    </div>
                  </div>
                );
              }

              // File / Document card
              return (
                <div
                  key={att.id}
                  onClick={() => void handleOpenAttachment(att)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-glass-hover)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getFileIcon(att.mime_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {att.original_name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                        marginTop: '2px',
                      }}
                    >
                      <span>{formatFileSize(att.size_bytes)}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(att.created_at)}</span>
                    </div>
                  </div>
                  <Download size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
