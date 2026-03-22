/** Detect video platform on current page */

export type VideoPlatform = 'youtube' | 'coursera' | 'udemy' | 'html5' | 'none';

export interface DetectedVideo {
  platform: VideoPlatform;
  videoElement: HTMLVideoElement | null;
  videoId?: string;
}

/** Detect which video platform (if any) is on the current page */
export function detectPlatform(): DetectedVideo {
  const hostname = window.location.hostname;

  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    const videoId = extractYouTubeId();
    const videoEl = document.querySelector<HTMLVideoElement>('video');
    return { platform: 'youtube', videoElement: videoEl, videoId: videoId ?? undefined };
  }

  if (hostname.includes('coursera.org')) {
    const videoEl = document.querySelector<HTMLVideoElement>('video');
    return { platform: videoEl ? 'coursera' : 'none', videoElement: videoEl };
  }

  if (hostname.includes('udemy.com')) {
    const videoEl = document.querySelector<HTMLVideoElement>('video');
    return { platform: videoEl ? 'udemy' : 'none', videoElement: videoEl };
  }

  // Generic HTML5 video
  const videoEl = document.querySelector<HTMLVideoElement>('video');
  if (videoEl) {
    return { platform: 'html5', videoElement: videoEl };
  }

  return { platform: 'none', videoElement: null };
}

/** Extract YouTube video ID from URL */
function extractYouTubeId(): string | null {
  const url = new URL(window.location.href);
  if (url.pathname === '/watch') return url.searchParams.get('v');
  if (url.pathname.startsWith('/embed/')) return url.pathname.split('/embed/')[1]?.split('?')[0] ?? null;
  if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/shorts/')[1]?.split('?')[0] ?? null;
  return null;
}
