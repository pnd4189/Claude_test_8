/** Generic HTML5 video track extractor — works with Coursera, Udemy, and standard <track> elements */

import { parseSubtitles, type SubtitleEntry } from '../parsers/subtitle-parser.ts';

/** Extract subtitles from HTML5 <track> elements */
export async function extractHTML5Subtitles(videoElement: HTMLVideoElement): Promise<SubtitleEntry[]> {
  // Find subtitle/caption tracks
  const tracks = videoElement.querySelectorAll<HTMLTrackElement>(
    'track[kind="subtitles"], track[kind="captions"]'
  );

  if (tracks.length === 0) return [];

  // Prefer English track, fallback to first track
  let selectedTrack = tracks[0];
  for (const track of tracks) {
    if (track.srclang === 'en') {
      selectedTrack = track;
      break;
    }
  }

  if (!selectedTrack.src) return [];

  // Fetch and parse subtitle file
  try {
    const res = await fetch(selectedTrack.src);
    if (!res.ok) return [];
    const content = await res.text();
    return parseSubtitles(content);
  } catch {
    return [];
  }
}
