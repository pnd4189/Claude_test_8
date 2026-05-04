/** Insert bilingual translation elements into the DOM (3 display modes) */

import type { DisplayMode } from '../providers/types.ts';

const TRANSLATED_CLASS = 'ait-translated';
const WRAPPER_CLASS = 'ait-wrapper';

/** Tracked hover event listeners for cleanup */
const hoverListeners = new Map<HTMLElement, { enter: () => void; leave: () => void }>();

/** Render translated text next to original element */
export function renderTranslation(
  originalEl: HTMLElement,
  translatedText: string,
  mode: DisplayMode
): void {
  // Remove existing translation if any
  removeTranslation(originalEl);

  switch (mode) {
    case 'below':
      renderBelow(originalEl, translatedText);
      break;
    case 'hover':
      renderHover(originalEl, translatedText);
      break;
    case 'side-by-side':
      renderSideBySide(originalEl, translatedText);
      break;
  }
}

/** Remove translation element from an original element */
export function removeTranslation(originalEl: HTMLElement): void {
  const id = originalEl.getAttribute('data-ait-id');
  if (!id) return;

  // Remove tracked hover listeners
  const listeners = hoverListeners.get(originalEl);
  if (listeners) {
    originalEl.removeEventListener('mouseenter', listeners.enter);
    originalEl.removeEventListener('mouseleave', listeners.leave);
    hoverListeners.delete(originalEl);
  }

  // Remove below/hover translation
  const existing = originalEl.parentElement?.querySelector(`[data-ait-for="${id}"]`);
  existing?.remove();

  // Unwrap side-by-side wrapper
  const wrapper = originalEl.closest(`.${WRAPPER_CLASS}`);
  if (wrapper && wrapper.parentElement) {
    wrapper.parentElement.insertBefore(originalEl, wrapper);
    wrapper.remove();
  }
}

/** Remove all translations from the page */
export function removeAllTranslations(): void {
  for (const [el, listeners] of hoverListeners) {
    el.removeEventListener('mouseenter', listeners.enter);
    el.removeEventListener('mouseleave', listeners.leave);
  }
  hoverListeners.clear();

  document.querySelectorAll(`.${TRANSLATED_CLASS}`).forEach((el) => el.remove());
  document.querySelectorAll(`.${WRAPPER_CLASS}`).forEach((wrapper) => {
    const original = wrapper.querySelector('[data-ait-id]');
    if (original && wrapper.parentElement) {
      wrapper.parentElement.insertBefore(original, wrapper);
      wrapper.remove();
    }
  });
}

/** Below mode: insert translated div after original */
function renderBelow(el: HTMLElement, text: string): void {
  const id = el.getAttribute('data-ait-id')!;
  const translated = document.createElement('div');
  translated.className = `${TRANSLATED_CLASS} ait-below`;
  translated.setAttribute('data-ait-for', id);
  translated.textContent = text;
  el.insertAdjacentElement('afterend', translated);
}

/** Hover mode: show tooltip on mouseenter */
function renderHover(el: HTMLElement, text: string): void {
  const id = el.getAttribute('data-ait-id')!;
  const tooltip = document.createElement('div');
  tooltip.className = `${TRANSLATED_CLASS} ait-hover`;
  tooltip.setAttribute('data-ait-for', id);
  tooltip.textContent = text;
  tooltip.style.display = 'none';

  el.insertAdjacentElement('afterend', tooltip);

  const enter = () => { tooltip.style.display = 'block'; };
  const leave = () => { tooltip.style.display = 'none'; };
  el.addEventListener('mouseenter', enter);
  el.addEventListener('mouseleave', leave);
  hoverListeners.set(el, { enter, leave });
}

/** Side-by-side mode: wrap in flex container */
function renderSideBySide(el: HTMLElement, text: string): void {
  const id = el.getAttribute('data-ait-id')!;

  // Don't double-wrap
  if (el.closest(`.${WRAPPER_CLASS}`)) return;

  const wrapper = document.createElement('div');
  wrapper.className = WRAPPER_CLASS;

  const translated = document.createElement('div');
  translated.className = `${TRANSLATED_CLASS} ait-side`;
  translated.setAttribute('data-ait-for', id);
  translated.textContent = text;

  el.parentElement?.insertBefore(wrapper, el);
  wrapper.appendChild(el);
  wrapper.appendChild(translated);
}
