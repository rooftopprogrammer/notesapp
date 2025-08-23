// components/amaravati/CopyToClipboard.tsx
// Copy to clipboard component with fallback

'use client';

import React, { useState } from 'react';
import { copyToClipboard } from '@/lib/amaravati/utils';
import toast from 'react-hot-toast';

interface CopyToClipboardProps {
  getText: () => string;
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function CopyToClipboard({
  getText,
  label = 'Copy to clipboard',
  className = '',
  children,
}: CopyToClipboardProps) {
  const [isCopying, setIsCopying] = useState(false);

  const handleCopy = async () => {
    if (isCopying) return;

    setIsCopying(true);
    try {
      const text = getText();
      const success = await copyToClipboard(text);
      
      if (success) {
        toast.success('Copied to clipboard!');
      } else {
        toast.error('Failed to copy to clipboard');
      }
    } catch (error) {
      toast.error('Failed to copy to clipboard');
      console.error('Copy error:', error);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={isCopying}
      className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      title={label}
      aria-label={label}
    >
      {children || (
        <>
          {isCopying ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
          Copy
        </>
      )}
    </button>
  );
}
