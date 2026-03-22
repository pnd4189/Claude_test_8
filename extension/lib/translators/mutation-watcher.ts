/** MutationObserver wrapper — watches for new content in SPAs and infinite scroll */

const DEBOUNCE_MS = 600;

export class MutationWatcher {
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private callback: (addedNodes: HTMLElement[]) => void;

  constructor(callback: (addedNodes: HTMLElement[]) => void) {
    this.callback = callback;
  }

  /** Start observing a container for new child elements */
  observe(container: HTMLElement): void {
    this.disconnect();

    this.observer = new MutationObserver((mutations) => {
      const addedElements: HTMLElement[] = [];

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            // Skip our own translation elements
            if (el.classList.contains('ait-translated') || el.classList.contains('ait-wrapper')) continue;
            addedElements.push(el);
          }
        }
      }

      if (addedElements.length > 0) {
        this.debouncedCallback(addedElements);
      }
    });

    this.observer.observe(container, { childList: true, subtree: true });
  }

  private debouncedCallback(elements: HTMLElement[]): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.callback(elements), DEBOUNCE_MS);
  }

  /** Stop observing */
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }
}
