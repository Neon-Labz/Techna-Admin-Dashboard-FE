'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { MouseEvent, PointerEvent, ReactNode, TouchEvent } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  height?: 'screen' | 'content';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  titleClassName?: string;
  titleStyle?: React.CSSProperties;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  height = 'content',
  closeOnBackdrop = true,
  showCloseButton = true,
  titleClassName,
  titleStyle,
}: ModalProps) {
  const backdropPointerStarted = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const stopModalEvent = (
    event:
      | MouseEvent<HTMLDivElement>
      | PointerEvent<HTMLDivElement>
      | TouchEvent<HTMLDivElement>,
  ) => {
    event.stopPropagation();
  };

  const handleBackdropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!closeOnBackdrop) return;

    backdropPointerStarted.current = event.target === event.currentTarget;
  };

  const handleBackdropPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (
      closeOnBackdrop &&
      backdropPointerStarted.current &&
      event.target === event.currentTarget
    ) {
      onClose();
    }

    backdropPointerStarted.current = false;
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex h-[100dvh] w-screen items-center justify-center overflow-hidden overscroll-none bg-black/50 p-3 backdrop-blur-sm sm:p-4"
      onPointerDown={handleBackdropPointerDown}
      onPointerUp={handleBackdropPointerUp}
    >
      <div
        className={`relative mx-auto flex w-full min-w-0 ${sizeMap[size]} flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:w-[95vw] sm:rounded-2xl md:w-full ${
          height === 'content'
            ? 'max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]'
            : 'h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)]'
        }`}
        onPointerDown={stopModalEvent}
        onPointerUp={stopModalEvent}
        onClick={stopModalEvent}
        onMouseDown={stopModalEvent}
        onTouchStart={stopModalEvent}
        onTouchEnd={stopModalEvent}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-3.5 md:p-4">
          <h3
            className={`min-w-0 flex-1 truncate font-bold ${titleClassName ?? 'text-base text-gray-800'}`}
            style={titleStyle}
          >
            {title}
          </h3>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div
          className={`min-h-0 overflow-y-auto overscroll-contain p-3.5 md:p-4 ${
            height === 'screen' ? 'flex-1' : ''
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
