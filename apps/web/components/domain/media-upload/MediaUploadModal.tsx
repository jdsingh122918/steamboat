'use client';

import React, { useCallback } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from '@/components/ui';
import { useFileUpload, type MediaUploadResult } from './useFileUpload';
import { FilePreviewItem } from './FilePreviewItem';
import { UploadDropzone } from './UploadDropzone';

/**
 * Props for MediaUploadModal.
 */
export interface MediaUploadModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal closes */
  onClose: () => void;
  /** Trip ID for upload context */
  tripId: string;
  /** Callback when uploads complete successfully */
  onUploaded?: (results: MediaUploadResult[]) => void;
}

/**
 * MediaUploadModal component for uploading photos and videos.
 *
 * Features:
 * - Multiple file selection
 * - Drag and drop support
 * - Preview thumbnails
 * - Per-file progress tracking
 * - Caption input per file
 * - Error handling with retry
 */
export function MediaUploadModal({
  isOpen,
  onClose,
  tripId,
  onUploaded,
}: MediaUploadModalProps): React.ReactElement {
  const {
    files,
    isDragging,
    isUploading,
    pendingCount,
    hasFiles,
    allComplete,
    setIsDragging,
    addFiles,
    removeFile,
    updateCaption,
    handleUpload,
    handleRetry,
    reset,
    abortUpload,
  } = useFileUpload({
    tripId,
    onUploaded,
    onAllComplete: () => handleClose(),
  });

  /**
   * Cancel uploads and close modal.
   */
  const handleClose = useCallback(() => {
    abortUpload();
    reset();
    onClose();
  }, [abortUpload, reset, onClose]);

  const buttonLabel = allComplete ? 'Close' : 'Cancel';
  const uploadButtonLabel = isUploading
    ? 'Uploading...'
    : `Upload ${pendingCount > 0 ? `(${pendingCount})` : ''}`;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalContent data-testid="media-upload-modal">
        <ModalHeader>Upload Photos & Videos</ModalHeader>
        <ModalBody>
          <UploadDropzone
            onFilesAdded={addFiles}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            compact={hasFiles}
          />

          {hasFiles && (
            <div className="upload-file-grid" data-testid="upload-file-grid">
              {files.map((fileState) => (
                <FilePreviewItem
                  key={fileState.id}
                  file={fileState}
                  onRemove={removeFile}
                  onCaptionChange={updateCaption}
                  onRetry={handleRetry}
                  isUploading={isUploading}
                />
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {buttonLabel}
          </Button>
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={pendingCount === 0}
            loading={isUploading}
          >
            {uploadButtonLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

MediaUploadModal.displayName = 'MediaUploadModal';

export { type MediaUploadResult };
