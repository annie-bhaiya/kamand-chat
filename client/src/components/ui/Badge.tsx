'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

const VARIANTS = {
  primary: {
    bg: 'var(--accent-light)',
    color: 'var(--accent)',
    border: '1px solid var(--accent-light)',
  },
  success: {
    bg: 'var(--success-light)',
    color: 'var(--success)',
    border: '1px solid var(--success-light)',
  },
  warning: {
    bg: 'var(--warning-light)',
    color: 'var(--warning)',
    border: '1px solid var(--warning-light)',
  },
  danger: {
    bg: 'var(--danger-light)',
    color: 'var(--danger)',
    border: '1px solid var(--danger-light)',
  },
  neutral: {
    bg: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-subtle)',
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
