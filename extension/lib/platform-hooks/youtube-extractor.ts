/** YouTube subtitle extractor — fetches captions via timedtext API */

import type { SubtitleEntry } from '../parsers/subtitle-parser.ts';

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: { simpleText?: string };
  kind?: string;
}

/** Extract subtitles from YouTube video */
export async function extractYouTubeSubtitles(videoId: string): Promise<SubtitleEntry[]> {
  // Try to get caption tracks from page data
  const tracks = getCaptionTracks();
  if (!tracks || tracks.length === 0) return [];

  // Prefer manual captions, fall back to auto-generated
  const manual = tracks.find((t) => !t.kind || t.kind !== 'asr');
  const track = manual ?? tracks[0];

  // Fetch XML captions
  const url = `${track.baseUrl}&fmt=json3`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json() as { events?: Array<{ tStartMs: number; dDurationMs: number; segs?: Array<{ utf8: string }> }> };
  if (!data.events) return [];

  const entries: SubtitleEntry[] = [];
  for (const event of data.events) {
    if (!event.segs) continue;
    const text = event.segs.map((s) => s.utf8).join('').trim();
    if (!text) continue;

    entries.push({
      start: event.tStartMs / 1000,
      end: (event.tStartMs + (event.dDurationMs || 3000)) / 1000,
      text,
    });
  }

  return entries;
}

/** Extract caption track info from YouTube page data */
function getCaptionTracks(): CaptionTrack[] | null {
  try {
    // Look for ytInitialPlayerResponse in page scripts
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent ?? '';
      if (!text.includes('captionTracks')) continue;

      const match = text.match(/"captionTracks":\s*(\[.*?\])/);
      if (match) return JSON.parse(match[1]);
    }

    // Fallback: try window.ytInitialPlayerResponse
    const ytData = (window as unknown as Record<string, unknown>).ytInitialPlayerResponse as
      { captions?: { playerCaptionsTracklistRenderer?: { captionTracks?: CaptionTrack[] } } } | undefined;
    return ytData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? null;
  } catch {
    return null;
  }
}
