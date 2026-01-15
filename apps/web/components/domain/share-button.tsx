'use client';

/**
 * Share button component.
 *
 * Uses the Web Share API when available, with clipboard fallback.
 */

import * as React from 'react';

export interface ShareContent {
  /** Share title */
  title: string;
  /** Share text/description */
  text?: string;
  /** URL to share */
  url: string;
}

export interface ShareButtonProps {
  /** Content to share */
  content: ShareContent;
  /** Custom button text (default: "Share") */
  buttonText?: string;
  /** Render as icon-only button */
  iconOnly?: boolean;
  /** Called on successful share */
  onShare?: () => void;
  /** Called when falling back to clipboard copy */
  onCopyFallback?: () => void;
  /** Called on share error (not called for user cancellation) */
  onError?: (error: Error) => void;
  /** Disable the button */
  disabled?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Share icon SVG component
 */
function ShareIcon() {
  return (
    <svg
      style={{ width: 16, height: 16, flexShrink: 0 }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

/**
 * Share button component that uses Web Share API with clipboard fallback.
 *
 * @example
 * <ShareButton
 *   content={{
 *     title: "Check out this trip!",
 *     text: "Join us for an amazing adventure",
 *     url: "https://example.com/trip/123"
 *   }}
 *   onShare={() => console.log("Shared!")}
 * />
 *
 * @example
 * // Icon-only variant
 * <ShareButton
 *   content={{ title: "Trip", url: "https://example.com/trip/123" }}
 *   iconOnly
 * />
 */
export function ShareButton({
  content,
  buttonText = 'Share',
  iconOnly = false,
  onShare,
  onCopyFallback,
  onError,
  disabled = false,
  className,
}: ShareButtonProps) {
  const handleShare = async () => {
    // Check if Web Share API is available
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.text,
          url: content.url,
        });
        onShare?.();
      } catch (error) {
        // Don't treat user cancellation as an error
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        onError?.(error instanceof Error ? error : new Error('Share failed'));
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(content.url);
        onCopyFallback?.();
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Copy failed'));
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={disabled}
      aria-label={iconOnly ? 'Share' : undefined}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: iconOnly ? 0 : '6px',
        padding: iconOnly ? '8px' : '8px 16px',
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: '14px',
        fontWeight: 500,
      }}
    >
      <ShareIcon />
      {!iconOnly && buttonText}
    </button>
  );
}

export default ShareButton;
