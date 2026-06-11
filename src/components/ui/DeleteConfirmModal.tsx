"use client";

import React from "react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .delete-modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .delete-modal-container {
          background: #ffffff;
          border-radius: 16px;
          padding: 40px 36px 32px;
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        }

        .delete-modal-icon-wrapper {
          width: 72px;
          height: 72px;
          background-color: #fde8e8;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }

        .delete-modal-icon-wrapper svg {
          width: 36px;
          height: 36px;
          color: #c0392b;
        }

        .delete-modal-title {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
          text-align: center;
        }

        .delete-modal-message {
          font-size: 14px;
          color: #6b7280;
          text-align: center;
          margin: 0 0 8px;
          line-height: 1.6;
          max-width: 300px;
        }

        .delete-modal-actions {
          display: flex;
          gap: 12px;
          width: 100%;
          margin-top: 4px;
        }

        .delete-modal-btn {
          flex: 1;
          padding: 13px 0;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s ease, transform 0.1s ease;
        }

        .delete-modal-btn:active {
          transform: scale(0.97);
        }

        .delete-modal-btn-cancel {
          background-color: #f0f0f0;
          color: #374151;
        }

        .delete-modal-btn-cancel:hover {
          background-color: #e2e2e2;
        }

        .delete-modal-btn-delete {
          background-color: #c0392b;
          color: #ffffff;
        }

        .delete-modal-btn-delete:hover {
          opacity: 0.88;
        }
      `}</style>

      <div className="delete-modal-overlay" onClick={onCancel}>
        <div
          className="delete-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Warning Icon */}
          <div className="delete-modal-icon-wrapper">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="delete-modal-title">Confirm Deletion</h2>

          {/* Dynamic Message */}
          <p className="delete-modal-message">{message}</p>

          {/* Action Buttons */}
          <div className="delete-modal-actions">
            <button
              className="delete-modal-btn delete-modal-btn-cancel"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              className="delete-modal-btn delete-modal-btn-delete"
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteConfirmModal;