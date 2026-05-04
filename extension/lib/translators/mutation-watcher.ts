/** MutationObserver wrapper — watches for new content in SPAs and infinite scroll */

const DEBOUNCE_MS = 600;

export class MutationWatcher {
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingElements: HTMLElement[] = [];
  private callback: (addedNodes: HTMLElement[]) => void;

  constructor(callback: (addedNodes: HTMLElement[]) => void) {
    this.callback = callback;
  }

  /** Start observing a container for new child elements */
  observe(container: HTMLElement): void {
    this.disconnect();

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.classList.contains('ait-translated') || el.classList.contains('ait-wrapper')) continue;
            this.pendingElements.push(el);
          }
        }
      }

      if (this.pendingElements.length > 0) {
        this.scheduleDispatch();
      }
    });

    this.observer.observe(container, { childList: true, subtree: true });
  }

  private scheduleDispatch(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const elements = this.pendingElements;
      this.pendingElements = [];
      this.debounceTimer = null;
      this.callback(elements);
    }, DEBOUNCE_MS);
  }

  /** Stop observing */
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    this.pendingElements = [];
  }
}
