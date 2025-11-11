/**
 * Content Script
 * Injects translation UI into web pages
 */

console.log('Free AI Translator content script loaded');

let selectedText = '';
let tooltip: HTMLDivElement | null = null;

// Listen for text selection
document.addEventListener('mouseup', handleTextSelection);

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE_SELECTION') {
    if (selectedText) {
      showTranslationTooltip(selectedText);
    }
  }
  sendResponse({ success: true });
});

/**
 * Handle text selection
 */
function handleTextSelection(event: MouseEvent) {
  const selection = window.getSelection();
  if (!selection || selection.toString().trim().length === 0) {
    hideTooltip();
    return;
  }

  selectedText = selection.toString().trim();

  // Don't show tooltip if text is too long (>500 chars)
  if (selectedText.length > 500) {
    return;
  }

  // Show tooltip near selection
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  showTranslationTooltip(selectedText, {
    x: rect.left + rect.width / 2,
    y: rect.top - 10,
  });
}

/**
 * Show translation tooltip
 */
async function showTranslationTooltip(
  text: string,
  position?: { x: number; y: number }
) {
  // Remove existing tooltip
  hideTooltip();

  // Create tooltip
  tooltip = document.createElement('div');
  tooltip.id = 'ai-translator-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    z-index: 999999;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 300px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  `;

  if (position) {
    tooltip.style.left = `${position.x}px`;
    tooltip.style.top = `${position.y}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';
  }

  // Show loading state
  tooltip.innerHTML = `
    <div style="color: #666;">
      <div style="margin-bottom: 8px; font-weight: 500;">Translating...</div>
      <div style="font-size: 12px;">${text.substring(0, 50)}${text.length > 50 ? '...' : ''}</div>
    </div>
  `;

  document.body.appendChild(tooltip);

  // Request translation
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TRANSLATE',
      payload: {
        text,
        sourceLang: 'en',
        targetLang: 'vi',
      },
    });

    if (response.success && tooltip) {
      tooltip.innerHTML = `
        <div>
          <div style="margin-bottom: 8px; color: #333; font-weight: 500;">
            ${response.data.translatedText}
          </div>
          <div style="font-size: 11px; color: #999; display: flex; justify-content: space-between; align-items: center;">
            <span>${response.data.cached ? '📦 Cached' : '✨ Fresh'}</span>
            <span>${response.data.provider}</span>
          </div>
        </div>
      `;
    } else {
      throw new Error(response.error || 'Translation failed');
    }
  } catch (error) {
    console.error('Translation error:', error);
    if (tooltip) {
      tooltip.innerHTML = `
        <div style="color: #d32f2f;">
          <div style="font-weight: 500; margin-bottom: 4px;">❌ Translation failed</div>
          <div style="font-size: 12px;">${error instanceof Error ? error.message : 'Unknown error'}</div>
        </div>
      `;
    }
  }
}

/**
 * Hide tooltip
 */
function hideTooltip() {
  if (tooltip && tooltip.parentNode) {
    tooltip.parentNode.removeChild(tooltip);
    tooltip = null;
  }
}

// Hide tooltip on scroll or click
window.addEventListener('scroll', hideTooltip);
document.addEventListener('click', hideTooltip);
