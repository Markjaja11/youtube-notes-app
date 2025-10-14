import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

function MarkdownEditor({ value, onChange, placeholder, className }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const isUpdatingRef = useRef(false);

  // Update editor content when value prop changes from parent
  useEffect(() => {
    if (editorRef.current && !isFocused && !isUpdatingRef.current) {
      renderContent(value || '');
    }
  }, [value, isFocused]);

  const getCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !editorRef.current) return null;

    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    const startOffset = range.startOffset;

    // Find which block element contains the cursor
    let blockElement = startNode;
    if (blockElement.nodeType === Node.TEXT_NODE) {
      blockElement = blockElement.parentElement;
    }

    // Find the block element (h1, h2, h3, p)
    while (blockElement && blockElement !== editorRef.current) {
      if (['H1', 'H2', 'H3', 'P'].includes(blockElement.nodeName)) {
        break;
      }
      blockElement = blockElement.parentElement;
    }

    if (!blockElement || blockElement === editorRef.current) {
      return null;
    }

    // Find block index
    const blocks = Array.from(editorRef.current.children);
    const blockIndex = blocks.indexOf(blockElement);

    // Calculate offset within the block
    let offsetInBlock = 0;
    const walker = document.createTreeWalker(
      blockElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let textNode;
    while (textNode = walker.nextNode()) {
      if (textNode === startNode) {
        offsetInBlock += startOffset;
        break;
      }
      offsetInBlock += textNode.textContent.length;
    }

    // Account for markdown prefix that's stored but not displayed
    const prefix = getMarkdownPrefix(blockElement.nodeName);
    const offsetWithPrefix = offsetInBlock + prefix.length;

    return { blockIndex, offsetInBlock: offsetWithPrefix };
  };

  const setCursorPosition = (position) => {
    if (!position || !editorRef.current) return;

    const { blockIndex, offsetInBlock } = position;
    const blocks = Array.from(editorRef.current.children);

    if (blockIndex >= blocks.length) {
      // Place cursor at the end if block index is out of range
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    const targetBlock = blocks[blockIndex];

    // Adjust offset by removing the markdown prefix length
    const prefix = getMarkdownPrefix(targetBlock.nodeName);
    const adjustedOffset = Math.max(0, offsetInBlock - prefix.length);

    const walker = document.createTreeWalker(
      targetBlock,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let currentOffset = 0;
    let textNode;

    while (textNode = walker.nextNode()) {
      const nodeLength = textNode.textContent.length;
      if (currentOffset + nodeLength >= adjustedOffset) {
        const selection = window.getSelection();
        const range = document.createRange();
        const position = Math.min(adjustedOffset - currentOffset, nodeLength);
        range.setStart(textNode, position);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      currentOffset += nodeLength;
    }

    // If we can't find the exact position, place at the end of the block
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(targetBlock);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const renderContent = (text) => {
    if (!editorRef.current) return;

    // Save cursor position before re-rendering
    const savedPosition = isFocused ? getCursorPosition() : null;

    const lines = text.split('\n');
    const html = lines.map(line => {
      // Check for headings
      if (line.startsWith('### ')) {
        return `<h3 class="markdown-h3" data-prefix="### ">${escapeHtml(line.slice(4))}</h3>`;
      } else if (line.startsWith('## ')) {
        return `<h2 class="markdown-h2" data-prefix="## ">${escapeHtml(line.slice(3))}</h2>`;
      } else if (line.startsWith('# ')) {
        return `<h1 class="markdown-h1" data-prefix="# ">${escapeHtml(line.slice(2))}</h1>`;
      } else {
        return `<p class="markdown-p">${escapeHtml(line) || '<br>'}</p>`;
      }
    }).join('');

    editorRef.current.innerHTML = html || `<p class="markdown-p"><br></p>`;

    // Restore cursor position after re-rendering
    if (savedPosition !== null && isFocused) {
      setCursorPosition(savedPosition);
    }
  };

  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const getMarkdownPrefix = (nodeName) => {
    if (nodeName === 'H1') return '# ';
    if (nodeName === 'H2') return '## ';
    if (nodeName === 'H3') return '### ';
    return '';
  };

  const getPlainText = () => {
    if (!editorRef.current) return '';

    const children = Array.from(editorRef.current.childNodes);
    return children.map(node => {
      let text = node.textContent || '';

      // Add markdown syntax based on the element type
      if (node.nodeName === 'H1') {
        return '# ' + text;
      } else if (node.nodeName === 'H2') {
        return '## ' + text;
      } else if (node.nodeName === 'H3') {
        return '### ' + text;
      } else if (node.nodeName === 'P' || node.nodeName === 'DIV') {
        return text;
      }
      return text;
    }).join('\n');
  };

  const handleInput = () => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    const text = getPlainText();

    // Trigger onChange to update parent
    onChange({ target: { value: text } });

    // Re-render with formatting immediately
    requestAnimationFrame(() => {
      renderContent(text);
      isUpdatingRef.current = false;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Get current selection
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);

      // Create a new paragraph
      const newP = document.createElement('p');
      newP.className = 'markdown-p';
      newP.innerHTML = '<br>';

      // Insert the new paragraph
      const currentNode = range.startContainer.parentElement;
      if (currentNode && currentNode.closest('[contenteditable]')) {
        const parent = currentNode.closest('h1, h2, h3, p') || currentNode;
        parent.parentNode.insertBefore(newP, parent.nextSibling);

        // Move cursor to new paragraph
        const newRange = document.createRange();
        newRange.setStart(newP, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        handleInput();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    isUpdatingRef.current = false;
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        "flex-1 outline-none px-5 py-4 overflow-y-auto",
        "focus:outline-none",
        className
      )}
      data-placeholder={placeholder}
      suppressContentEditableWarning
    />
  );
}

export default MarkdownEditor;
