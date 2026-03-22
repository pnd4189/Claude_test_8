/** Detect main content area of a webpage for translation */

const CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '.post-content',
  '.post-body',
  '.article-content',
  '.entry-content',
  '.content',
  '#content',
];

const SKIP_SELECTORS = [
  'nav', 'header', 'footer', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '.sidebar', '.ad', '.advertisement', '.menu', '.toolbar',
  'script', 'style', 'noscript', 'iframe',
];

/** Find the main content container on the page */
export function detectContentArea(): HTMLElement | null {
  // Try specific selectors first
  for (const selector of CONTENT_SELECTORS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.textContent && el.textContent.trim().length > 200) {
      return el;
    }
  }

  // Fallback: find largest text-dense container
  return findLargestTextContainer();
}

/** Heuristic: find the element with the most text content */
function findLargestTextContainer(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>('div, section');
  let bestEl: HTMLElement | null = null;
  let bestScore = 0;

  for (const el of candidates) {
    // Skip navigation/sidebar elements
    if (matchesSkipSelector(el)) continue;

    const text = el.textContent?.trim() ?? '';
    if (text.length < 200) continue;

    // Score: text length weighted by paragraph density
    const paragraphs = el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
    const score = text.length * Math.sqrt(paragraphs.length + 1);

    if (score > bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  return bestEl;
}

/** Check if element matches skip selectors */
function matchesSkipSelector(el: HTMLElement): boolean {
  for (const sel of SKIP_SELECTORS) {
    if (el.matches(sel) || el.closest(sel)) return true;
  }
  return false;
}
