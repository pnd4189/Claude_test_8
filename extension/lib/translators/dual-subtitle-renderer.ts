/** Render bilingual subtitles overlaid on video player */

import type { TranslatedSubtitle } from './subtitle-translator.ts';

const CONTAINER_CLASS = 'ait-subtitle-container';
const ORIGINAL_CLASS = 'ait-subtitle-original';
const TRANSLATED_CLASS = 'ait-subtitle-translated';

export class DualSubtitleRenderer {
  private container: HTMLDivElement | null = null;
  private originalEl: HTMLDivElement | null = null;
  private translatedEl: HTMLDivElement | null = null;
  private subtitles: TranslatedSubtitle[] = [];
  private videoElement: HTMLVideoElement;
  private animFrameId: number | null = null;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  /** Initialize subtitle overlay on the video */
  mount(subtitles: TranslatedSubtitle[]): void {
    this.subtitles = subtitles;
    this.createOverlay();
    this.startSync();
  }

  /** Remove subtitle overlay */
  unmount(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.container?.remove();
    this.container = null;
  }

  private createOverlay(): void {
    // Find video container (parent that wraps the video)
    const parent = this.videoElement.parentElement;
    if (!parent) return;

    // Ensure parent is positioned for absolute overlay
    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    this.container = document.createElement('div');
    this.container.className = CONTAINER_CLASS;
    this.container.style.cssText = `
      position: absolute; bottom: 60px; left: 0; right: 0;
      text-align: center; pointer-events: none; z-index: 9999;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    `;

    this.originalEl = document.createElement('div');
    this.originalEl.className = ORIGINAL_CLASS;
    this.originalEl.style.cssText = `
      background: rgba(0,0,0,0.6); color: #fff; padding: 4px 12px;
      border-radius: 4px; font-size: 14px; max-width: 80%;
      display: none;
    `;

    this.translatedEl = document.createElement('div');
    this.translatedEl.className = TRANSLATED_CLASS;
    this.translatedEl.style.cssText = `
      background: rgba(0,0,0,0.75); color: #ffd700; padding: 4px 12px;
      border-radius: 4px; font-size: 15px; font-weight: 500; max-width: 80%;
      display: none;
    `;

    this.container.appendChild(this.originalEl);
    this.container.appendChild(this.translatedEl);
    parent.appendChild(this.container);
  }

  private startSync(): void {
    const tick = () => {
      this.updateDisplay();
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private updateDisplay(): void {
    if (!this.originalEl || !this.translatedEl) return;

    const currentTime = this.videoElement.currentTime;
    const active = this.subtitles.find(
      (s) => currentTime >= s.start && currentTime <= s.end
    );

    if (active) {
      this.originalEl.textContent = active.original;
      this.originalEl.style.display = 'inline-block';
      this.translatedEl.textContent = active.translated;
      this.translatedEl.style.display = 'inline-block';
    } else {
      this.originalEl.style.display = 'none';
      this.translatedEl.style.display = 'none';
    }
  }
}
