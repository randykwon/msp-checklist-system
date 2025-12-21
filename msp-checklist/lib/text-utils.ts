import React from 'react';

/**
 * Utility functions for text processing and rendering
 */

/**
 * Converts URLs in text to clickable links
 * @param text - The text containing URLs
 * @returns JSX elements with clickable links
 */
export function renderTextWithLinks(text: string): React.ReactNode {
  if (!text) return text;

  // Regular expression to match URLs
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      return React.createElement('a', {
        key: index,
        href: part,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-blue-600 hover:text-blue-800 underline break-all'
      }, part);
    }
    return part;
  });
}

/**
 * Extracts URLs from text
 * @param text - The text to extract URLs from
 * @returns Array of URLs found in the text
 */
export function extractUrls(text: string): string[] {
  if (!text) return [];
  
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Checks if text contains URLs
 * @param text - The text to check
 * @returns True if text contains URLs
 */
export function hasUrls(text: string): boolean {
  if (!text) return false;
  
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  return urlRegex.test(text);
}