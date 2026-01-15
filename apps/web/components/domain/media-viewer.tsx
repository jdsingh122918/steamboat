'use client';

import React, { useState, useCallback, useEffect } from 'react';

interface MediaUploader {
  id: string;
  name: string;
}

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  caption?: string;
  uploadedBy: MediaUploader;
  uploadedAt: Date;
  tags: string[];
}

interface MediaViewerProps {
  media: MediaItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (mediaId: string) => Promise<void>;
  onDelete: (mediaId: string) => Promise<void>;
  onNavigate: (index: number) => void;
  canDelete: boolean;
  className?: string;
}

export function MediaViewer({
  media,
  initialIndex,
  isOpen,
  onClose,
  onDownload,
  onDelete,
  onNavigate,
  canDelete,
  className = '',
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentMedia = media[currentIndex];

  // Update currentIndex when initialIndex prop changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsLoading(true);
  }, [initialIndex]);

  const handleNavigate = useCallback(
    (newIndex: number) => {
      if (newIndex >= 0 && newIndex < media.length) {
        setCurrentIndex(newIndex);
        setIsLoading(true);
        onNavigate(newIndex);
      }
    },
    [media.length, onNavigate]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && currentIndex < media.length - 1) {
        handleNavigate(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        handleNavigate(currentIndex - 1);
      }
    },
    [isOpen, currentIndex, media.length, handleNavigate, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleDownload = useCallback(async () => {
    await onDownload(currentMedia.id);
  }, [currentMedia.id, onDownload]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(currentMedia.id);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }, [currentMedia.id, onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) {
    return null;
  }

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < media.length - 1;

  return (
    <div
      className={`media-viewer-overlay ${className}`}
      data-testid="viewer-overlay"
      onClick={handleOverlayClick}
    >
      <div className="media-viewer" data-testid="media-viewer">
        <div className="viewer-header">
          <span className="viewer-counter">
            {currentIndex + 1} / {media.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="close-button"
            aria-label="Close viewer"
          >
            ×
          </button>
        </div>

        <div className="viewer-content">
          {hasPrevious && (
            <button
              type="button"
              onClick={() => handleNavigate(currentIndex - 1)}
              className="nav-button prev"
              aria-label="Previous"
            >
              ‹
            </button>
          )}

          <div className="media-container">
            {isLoading && (
              <div className="media-loading" data-testid="media-loading">
                Loading...
              </div>
            )}

            {currentMedia.type === 'image' ? (
              <img
                src={currentMedia.url}
                alt={currentMedia.caption || 'Media'}
                className="viewer-image"
                onLoad={handleImageLoad}
              />
            ) : (
              <video
                src={currentMedia.url}
                controls
                className="viewer-video"
                data-testid="video-player"
                onLoadedData={handleImageLoad}
              />
            )}
          </div>

          {hasNext && (
            <button
              type="button"
              onClick={() => handleNavigate(currentIndex + 1)}
              className="nav-button next"
              aria-label="Next"
            >
              ›
            </button>
          )}
        </div>

        <div className="viewer-info">
          {currentMedia.caption && (
            <p className="media-caption">{currentMedia.caption}</p>
          )}

          <div className="media-meta">
            <span className="uploader">
              Uploaded by {currentMedia.uploadedBy.name}
            </span>
            <span className="upload-date">
              {formatDate(currentMedia.uploadedAt)}
            </span>
          </div>

          {currentMedia.tags.length > 0 && (
            <div className="media-tags" data-testid="media-tags">
              {currentMedia.tags.map((tag) => (
                <span key={tag} className="media-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="viewer-actions">
          <button
            type="button"
            onClick={handleDownload}
            className="action-button download"
          >
            Download
          </button>

          {canDelete && !showDeleteConfirm && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="action-button delete"
            >
              Delete
            </button>
          )}

          {showDeleteConfirm && (
            <div className="delete-confirm">
              <span className="confirm-text">Confirm delete?</span>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="confirm-delete-button"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { MediaViewerProps, MediaItem, MediaUploader };
