'use client';

import { useState, useEffect } from 'react';
import { getInitials } from '@/lib/teachers';

export function TeacherAvatar({
  src,
  name,
  className = '',
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
  }, [src]);

  if (!src || !src.trim() || failed) {
    return (
      <div className={`flex items-center justify-center bg-indigo-100 ${className}`}>
        <span className="text-indigo-600 font-bold text-lg">{getInitials(name)}</span>
      </div>
    );
  }

  const finalSrc = attempt > 0 ? `${src}${src.includes('?') ? '&' : '?'}r=${attempt}` : src;

  return (
    <img
      key={finalSrc}
      src={finalSrc}
      alt={name}
      className={`object-cover ${className}`}
      onError={() => {
        if (attempt < 2) {
          // Retry shortly after — covers R2 eventual-consistency right after upload
          setTimeout(() => setAttempt(a => a + 1), 600);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
