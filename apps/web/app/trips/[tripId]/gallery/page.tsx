'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Spinner, Card, CardContent, Select, Modal, ModalContent, ModalBody } from '@/components/ui';
import { PageHeader } from '@/components/navigation';
import { MediaCard, MediaUploadModal } from '@/components/domain';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  uploadedBy: { id: string; name: string };
  uploadedAt: string;
  date: string;
  caption?: string;
}

interface Attendee {
  id: string;
  name: string;
}

interface MediaData {
  media: MediaItem[];
}

interface AttendeeData {
  attendees: Attendee[];
}

export default function GalleryPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [media, setMedia] = useState<MediaData | null>(null);
  const [attendees, setAttendees] = useState<AttendeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [personFilter, setPersonFilter] = useState('');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [mediaRes, attendeesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}/media`),
          fetch(`/api/trips/${tripId}/attendees`),
        ]);

        if (!mediaRes.ok) {
          throw new Error('Failed to load media');
        }

        const mediaData = await mediaRes.json();
        setMedia(mediaData.data);

        if (attendeesRes.ok) {
          const attendeesData = await attendeesRes.json();
          setAttendees(attendeesData.data);
        }
      } catch (err) {
        setError('Failed to load gallery data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tripId]);

  const filteredMedia = useMemo(() => {
    if (!media?.media) return [];

    return media.media.filter((item) => {
      const matchesDate = !dateFilter || item.date === dateFilter;
      const matchesPerson = !personFilter || item.uploadedBy.id === personFilter;
      return matchesDate && matchesPerson;
    });
  }, [media, dateFilter, personFilter]);

  const uniqueDates = useMemo(() => {
    if (!media?.media) return [];
    const dates = [...new Set(media.media.map((m) => m.date))];
    return dates.sort();
  }, [media]);

  const dateOptions = useMemo(() => {
    return [
      { value: '', label: 'All Days' },
      ...uniqueDates.map((date) => ({
        value: date,
        label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      })),
    ];
  }, [uniqueDates]);

  const personOptions = useMemo(() => {
    return [
      { value: '', label: 'All People' },
      ...(attendees?.attendees || []).map((a) => ({
        value: a.id,
        label: a.name,
      })),
    ];
  }, [attendees]);

  /**
   * Refresh gallery data after upload.
   */
  const refreshMedia = useCallback(async () => {
    try {
      const mediaRes = await fetch(`/api/trips/${tripId}/media`);
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        setMedia(mediaData.data);
      }
    } catch (err) {
      // Silently fail - user can manually refresh
      console.error('Failed to refresh media:', err);
    }
  }, [tripId]);

  /**
   * Handle successful uploads.
   */
  const handleUploadComplete = useCallback(() => {
    refreshMedia();
    setShowUploadModal(false);
  }, [refreshMedia]);

  if (loading) {
    return (
      <div className="gallery-loading" data-testid="gallery-loading">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="gallery-error" data-testid="gallery-error">
        <p>{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="gallery-page" data-testid="gallery-page">
      <PageHeader
        title="Gallery"
        subtitle={`${media?.media.length || 0} photos & videos`}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowUploadModal(true)}
          >
            Upload
          </Button>
        }
      />

      <div className="gallery-content">
        {/* Filters */}
        <div className="gallery-filters">
          <Select
            label="Day"
            id="date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            options={dateOptions}
          />
          <Select
            label="Person"
            id="person-filter"
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            options={personOptions}
          />
        </div>

        {/* Media Grid */}
        {filteredMedia.length > 0 ? (
          <div className="media-grid" data-testid="media-grid">
            {filteredMedia.map((item) => (
              <MediaCard
                key={item.id}
                id={item.id}
                type={item.type}
                thumbnailUrl={item.thumbnailUrl}
                uploadedBy={item.uploadedBy.name}
                uploadedAt={new Date(item.uploadedAt)}
                caption={item.caption}
                onClick={() => setSelectedMedia(item)}
              />
            ))}
          </div>
        ) : (
          <Card className="gallery-empty">
            <CardContent>
              <div className="gallery-empty-content">
                <p className="gallery-empty-text">No photos or videos yet</p>
                <Button
                  variant="primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload First Photo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Modal */}
      <MediaUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        tripId={tripId}
        onUploaded={handleUploadComplete}
      />

      {/* Media Viewer */}
      <Modal isOpen={!!selectedMedia} onClose={() => setSelectedMedia(null)}>
        <ModalContent className="media-viewer-content" data-testid="media-viewer">
          <ModalBody>
            {selectedMedia && (
              <>
                {selectedMedia.type === 'image' ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.caption || 'Photo'}
                    className="media-viewer-image"
                  />
                ) : (
                  <video
                    src={selectedMedia.url}
                    controls
                    className="media-viewer-video"
                  />
                )}
                {selectedMedia.caption && (
                  <p className="media-viewer-caption">{selectedMedia.caption}</p>
                )}
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
