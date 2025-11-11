'use client';

import { useTranslations } from 'next-intl';
import { useState, useRef } from 'react';
import { detectFormatFromFilename, validateFileSize, type FileFormat } from '@/lib/file-parsers';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export function FileUpload({
  onFileSelect,
  accept = '.epub,.pdf,.txt,.docx',
  maxSize = 50 * 1024 * 1024, // 50MB
}: FileUploadProps) {
  const t = useTranslations();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError(null);

    // Validate file size
    if (!validateFileSize(file.size, maxSize)) {
      setError(t('errors.fileTooBig'));
      return;
    }

    // Validate file format
    const format = detectFormatFromFilename(file.name);
    if (!format) {
      setError(t('errors.unsupportedFormat'));
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="text-4xl">📄</div>

          <div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {t('home.upload')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('home.or')} drag and drop
            </p>
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500">
            <p>{t('home.supportedFormats')}</p>
            <p>{t('home.maxSize')}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
