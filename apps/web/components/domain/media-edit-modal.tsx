'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui';
import { TagInput } from './tag-input';
import { formatDateShort } from '@/lib/utils/format';

interface MediaData {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  tags?: string[];
  uploadedBy: string;
  uploadedAt: string;
}

interface MediaEditData {
  caption: string;
  tags: string[];
}

interface MediaEditModalProps {
  isOpen: boolean;
  media: MediaData;
  onSave: (data: MediaEditData) => Promise<void>;
  onClose: () => void;
  suggestedTags?: string[];
  className?: string;
}

export function MediaEditModal({
  isOpen,
  media,
  onSave,
  onClose,
  suggestedTags = [],
  className = '',
}: MediaEditModalProps) {
  const [caption, setCaption] = useState(media.caption || '');
  const [tags, setTags] = useState<string[]>(media.tags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when media changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCaption(media.caption || '');
      setTags(media.tags || []);
      setError(null);
    }
  }, [isOpen, media]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave({ caption, tags });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [caption, tags, isSaving, onSave, onClose]);

  const handleCancel = useCallback(() => {
    setCaption(media.caption || '');
    setTags(media.tags || []);
    setError(null);
    onClose();
  }, [media, onClose]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      size="lg"
      aria-labelledby="media-edit-title"
    >
      <ModalContent data-testid="media-edit-modal" className={className}>
        <ModalHeader>
          <h2 id="media-edit-title">Edit Photo</h2>
        </ModalHeader>

        <ModalBody>
          <div className="media-edit-preview">
            <img src={media.url} alt={caption || 'Media'} className="media-edit-image" />
          </div>

          <div className="media-edit-info">
            <span className="media-edit-uploader">Uploaded by {media.uploadedBy}</span>
            <span className="media-edit-date">{formatDateShort(media.uploadedAt)}</span>
          </div>

          <div className="media-edit-form">
            <div className="form-field">
              <label htmlFor="media-caption" className="form-label">
                Caption
              </label>
              <textarea
                id="media-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Tags</label>
              <TagInput
                tags={tags}
                onChange={setTags}
                suggestions={suggestedTags}
                placeholder="Add tag..."
              />
            </div>
          </div>

          {error && (
            <div className="media-edit-error" role="alert">
              {error}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export type { MediaEditModalProps, MediaData, MediaEditData };
