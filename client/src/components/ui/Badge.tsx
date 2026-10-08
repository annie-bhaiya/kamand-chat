'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

const VARIANTS = {
  primary: {
    bg: 'rgba(99, 102, 241, 0.18)',
    color: '#a5b4fc',
    border: '1px solid rgba(99, 102, 241, 0.35)',
  },
  success: {
    bg: 'rgba(16, 185, 129, 0.18)',
    color: '#6ee7b7',
    border: '1px solid rgba(16, 185, 129, 0.35)',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.18)',
    color: '#fcd34d',
    border: '1px solid rgba(245, 158, 11, 0.35)',
  },
  danger: {
    bg: 'rgba(244, 63, 94, 0.18)',
    color: '#fda4af',
    border: '1px solid rgba(244, 63, 94, 0.35)',
  },
  neutral: {
    bg: 'rgba(255, 255, 255, 0.08)',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const styles = VARIANTS[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: size === 'sm' ? '2px 7px' : '3px 10px',
        borderRadius: '9999px',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        backgroundColor: styles.bg,
        color: styles.color,
        border: styles.border,
        letterSpacing: '0.02em',
        userSelect: 'none',
      }}
    >
      {children}
    </span>
  );
};
