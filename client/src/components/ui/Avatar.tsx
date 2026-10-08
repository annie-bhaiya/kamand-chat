'use client';

import React from 'react';
import { getAvatarGradient, getInitials } from '@/lib/utils';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP = {
  xs: { size: 24, font: 10, dot: 6 },
  sm: { size: 32, font: 12, dot: 8 },
  md: { size: 40, font: 14, dot: 10 },
  lg: { size: 52, font: 18, dot: 12 },
  xl: { size: 72, font: 24, dot: 14 },
};

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  src,
  size = 'md',
  online,
  className = '',
  onClick,
}) => {
  const { size: pixelSize, font, dot } = SIZE_MAP[size];
  const gradient = getAvatarGradient(name || 'pulse');
  const initials = getInitials(name);

  return (
    <div
      onClick={onClick}
      style={{
        width: pixelSize,
        height: pixelSize,
        minWidth: pixelSize,
        minHeight: pixelSize,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
      className={className}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: src ? 'transparent' : gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: font,
          letterSpacing: '-0.02em',
          userSelect: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {src ? (
          <img
            src={src}
            alt={name || 'Avatar'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initials
        )}
      </div>

      {online !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dot,
            height: dot,
            borderRadius: '50%',
            backgroundColor: online ? '#10b981' : '#64748b',
            border: '2px solid #0e1526',
            boxShadow: online ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
          }}
        />
      )}
    </div>
  );
};
