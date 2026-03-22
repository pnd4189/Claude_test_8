import { useState, useCallback, useRef } from 'react';
import { EpubReader } from './epub-reader.tsx';
import { PdfReader } from './pdf-reader.tsx';

type ReaderTab = 'pdf' | 'epub';

export default function App() {
  const [activeTab, setActiveTab] = useState<ReaderTab>('epub');
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      if (file.name.endsWith('.epub')) {
        setActiveTab('epub');
        setEpubData(buffer);
      } else if (file.name.endsWith('.pdf')) {
        setActiveTab('pdf');
        setPdfData(buffer);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePickFile = () => fileInputRef.current?.click();

  // Show reader if file loaded
  if (activeTab === 'epub' && epubData) {
    return (
      <div className="flex h-screen flex-col">
        <ReaderToolbar activeTab={activeTab} setActiveTab={setActiveTab} onNewFile={handlePickFile} />
        <input ref={fileInputRef} type="file" accept=".epub,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        <div className="flex-1 overflow-hidden">
          <EpubReader fileData={epubData} />
        </div>
      </div>
    );
  }

  if (activeTab === 'pdf' && pdfData) {
    return (
      <div className="flex h-screen flex-col">
        <ReaderToolbar activeTab={activeTab} setActiveTab={setActiveTab} onNewFile={handlePickFile} />
        <input ref={fileInputRef} type="file" accept=".epub,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
        <div className="flex-1 overflow-hidden">
          <PdfReader fileData={pdfData} />
        </div>
      </div>
    );
  }

  // Upload screen
  return (
    <div className="flex h-screen flex-col">
      <ReaderToolbar activeTab={activeTab} setActiveTab={setActiveTab} onNewFile={handlePickFile} />
      <input ref={fileInputRef} type="file" accept=".epub,.pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

      <div
        className="flex flex-1 items-center justify-center p-6"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="text-center space-y-3 border-2 border-dashed border-[var(--border)] rounded-lg p-8 w-full max-w-sm">
          <p className="text-lg font-medium">
            {activeTab === 'pdf' ? 'PDF Reader' : 'ePub Reader'}
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Drop a .{activeTab} file here or click to open
          </p>
          <button
            onClick={handlePickFile}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
          >
            Choose File
          </button>
          <button
            onClick={() => chrome.tabs?.create({ url: chrome.runtime.getURL('/sidepanel.html') })}
            className="block mx-auto mt-2 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Open in New Tab
          </button>
        </div>
      </div>
    </div>
  );
}

function ReaderToolbar({ activeTab, setActiveTab, onNewFile }: {
  activeTab: ReaderTab;
  setActiveTab: (tab: ReaderTab) => void;
  onNewFile: () => void;
}) {
  return (
    <div className="flex border-b">
      {(['epub', 'pdf'] as ReaderTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex-1 px-4 py-2 text-sm font-medium uppercase transition-colors ${
            activeTab === tab
              ? 'border-b-2 border-[var(--primary)] text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {tab}
        </button>
      ))}
      <button
        onClick={onNewFile}
        className="px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        title="Open new file"
      >
        +
      </button>
    </div>
  );
}
