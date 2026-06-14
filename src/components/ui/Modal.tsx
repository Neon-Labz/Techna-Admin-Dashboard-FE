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
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
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
  closeOnBackdrop = true,
  showCloseButton = true,
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
      className="fixed inset-0 z-50 h-[100dvh] w-screen overflow-hidden overscroll-none bg-black/50 p-2 sm:p-4"
      onPointerDown={handleBackdropPointerDown}
      onPointerUp={handleBackdropPointerUp}
    >
      <div
        className={`relative mx-auto flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-full min-w-0 max-w-full ${sizeMap[size]} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[95vw] md:w-full`}
        onPointerDown={stopModalEvent}
        onPointerUp={stopModalEvent}
        onClick={stopModalEvent}
        onMouseDown={stopModalEvent}
        onTouchStart={stopModalEvent}
        onTouchEnd={stopModalEvent}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4 md:p-5">
          <h3 className="text-base font-bold text-gray-800 md:text-lg">
            {title}
          </h3>

          {showCloseButton && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-5">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
