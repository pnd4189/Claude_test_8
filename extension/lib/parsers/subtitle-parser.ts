/** VTT/SRT subtitle parser — parses subtitle files into timestamped entries */

export interface SubtitleEntry {
  start: number; // seconds
  end: number;   // seconds
  text: string;
}

/** Parse WebVTT content */
export function parseVTT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = content.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    // Find the timestamp line
    const tsIndex = lines.findIndex((l) => l.includes('-->'));
    if (tsIndex === -1) continue;

    const [startStr, endStr] = lines[tsIndex].split('-->').map((s) => s.trim());
    const start = parseTimestamp(startStr);
    const end = parseTimestamp(endStr);
    if (start === null || end === null) continue;

    const text = lines.slice(tsIndex + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (text) entries.push({ start, end, text });
  }

  return entries;
}

/** Parse SRT content */
export function parseSRT(content: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const blocks = content.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    // Find timestamp line (skip sequence number)
    const tsIndex = lines.findIndex((l) => l.includes('-->'));
    if (tsIndex === -1) continue;

    const [startStr, endStr] = lines[tsIndex].split('-->').map((s) => s.trim());
    const start = parseTimestamp(startStr);
    const end = parseTimestamp(endStr);
    if (start === null || end === null) continue;

    const text = lines.slice(tsIndex + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    if (text) entries.push({ start, end, text });
  }

  return entries;
}

/** Auto-detect format and parse */
export function parseSubtitles(content: string): SubtitleEntry[] {
  const trimmed = content.trim();
  if (trimmed.startsWith('WEBVTT')) return parseVTT(trimmed);
  // SRT starts with a number
  if (/^\d+\s*\n/.test(trimmed)) return parseSRT(trimmed);
  // Try VTT as fallback
  return parseVTT(trimmed);
}

/** Parse timestamp string to seconds: "00:01:23.456" or "00:01:23,456" */
function parseTimestamp(ts: string): number | null {
  const clean = ts.replace(',', '.').trim();
  const match = clean.match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;

  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = parseInt(match[2]);
  const seconds = parseFloat(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}
