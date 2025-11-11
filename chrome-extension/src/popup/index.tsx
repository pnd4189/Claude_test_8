/**
 * Extension Popup
 * Quick translation interface
 */

import { h, render } from 'preact';
import { useState } from 'preact/hooks';

function Popup() {
  const [text, setText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTranslate = async () => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError('');
    setTranslatedText('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        payload: {
          text: text.trim(),
          sourceLang: 'en',
          targetLang: 'vi',
        },
      });

      if (response.success) {
        setTranslatedText(response.data.translatedText);
      } else {
        setError(response.error || 'Translation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setText('');
    setTranslatedText('');
    setError('');
  };

  return (
    <div>
      <h1>🌐 Free AI Translator</h1>

      <div className="section">
        <label>Enter text to translate:</label>
        <textarea
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          placeholder="Type or paste text here..."
          disabled={isLoading}
        />
      </div>

      <button
        onClick={handleTranslate}
        disabled={!text.trim() || isLoading}
      >
        {isLoading ? 'Translating...' : 'Translate'}
      </button>

      {translatedText && (
        <div className="section">
          <label>Translation:</label>
          <div className="result">{translatedText}</div>
        </div>
      )}

      {error && (
        <div className="section">
          <div className="result error">{error}</div>
        </div>
      )}

      {(translatedText || error) && (
        <button
          onClick={handleClear}
          style={{ marginTop: '8px', background: '#6b7280' }}
        >
          Clear
        </button>
      )}

      <div className="footer">
        <p>Select text on any page to translate</p>
      </div>
    </div>
  );
}

// Render popup
render(<Popup />, document.getElementById('root')!);
