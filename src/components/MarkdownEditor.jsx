import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

function MarkdownEditor({ value, onChange, placeholder, className }) {
  const editorRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const isUpdatingRef = useRef(false);
  const rafIdRef = useRef(null);
  const isMountedRef = useRef(true);

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

    // Find the block element (h1, h2, h3, p, li, pre, ul)
    while (blockElement && blockElement !== editorRef.current) {
      if (['H1', 'H2', 'H3', 'P', 'LI', 'PRE', 'UL'].includes(blockElement.nodeName)) {
        break;
      }
      blockElement = blockElement.parentElement;
    }

    if (!blockElement || blockElement === editorRef.current) {
      return null;
    }

    // If we're in an LI, we need to find which LI within the UL
    let actualBlock = blockElement;
    let liIndex = 0;
    if (blockElement.nodeName === 'LI') {
      const ul = blockElement.parentElement;
      if (ul && ul.nodeName === 'UL') {
        const listItems = Array.from(ul.children);
        liIndex = listItems.indexOf(blockElement);
        actualBlock = ul;  // Use the UL as the block
      }
    }

    // Find block index in the editor
    const blocks = Array.from(editorRef.current.children);
    const blockIndex = blocks.indexOf(actualBlock);

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
    const prefix = getMarkdownPrefix(blockElement.nodeName, blockElement);
    const offsetWithPrefix = offsetInBlock + prefix.length;

    return { blockIndex, offsetInBlock: offsetWithPrefix, liIndex };
  };

  const setCursorPosition = (position) => {
    if (!position || !editorRef.current) return;

    const { blockIndex, offsetInBlock, liIndex } = position;
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

    let targetBlock = blocks[blockIndex];

    // If it's a UL, get the specific LI
    if (targetBlock.nodeName === 'UL' && liIndex !== undefined) {
      const listItems = Array.from(targetBlock.children);
      if (liIndex < listItems.length) {
        targetBlock = listItems[liIndex];
      }
    }

    // Adjust offset by removing the markdown prefix length
    const prefix = getMarkdownPrefix(targetBlock.nodeName, targetBlock);
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

  const parseInlineMarkdown = (text) => {
    // Escape HTML first
    let html = escapeHtml(text);

    // Parse inline code first (so it doesn't get affected by other formatting)
    html = html.replace(/`([^`]+)`/g, '<code class="markdown-code">$1</code>');

    // Parse bold (**text** or __text__)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="markdown-bold">$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong class="markdown-bold">$1</strong>');

    // Parse italic (*text* or _text_) - must come after bold
    html = html.replace(/\*([^*]+)\*/g, '<em class="markdown-italic">$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em class="markdown-italic">$1</em>');

    return html;
  };

  const renderContent = (text) => {
    if (!editorRef.current) return;

    // Save cursor position before re-rendering
    const savedPosition = isFocused ? getCursorPosition() : null;

    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check for headings
      if (line.startsWith('### ')) {
        elements.push(`<h3 class="markdown-h3" data-prefix="### ">${parseInlineMarkdown(line.slice(4))}</h3>`);
        i++;
      } else if (line.startsWith('## ')) {
        elements.push(`<h2 class="markdown-h2" data-prefix="## ">${parseInlineMarkdown(line.slice(3))}</h2>`);
        i++;
      } else if (line.startsWith('# ')) {
        elements.push(`<h1 class="markdown-h1" data-prefix="# ">${parseInlineMarkdown(line.slice(2))}</h1>`);
        i++;
      }
      // Check for numbered lists
      else if (line.match(/^\d+\.\s+/)) {
        // Collect all consecutive numbered list items
        const listItems = [];
        while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
          const match = lines[i].match(/^(\d+)\.\s+/);
          const number = match[1];
          const content = lines[i].replace(/^\d+\.\s+/, '');
          listItems.push(`<li class="markdown-li-numbered" data-prefix="${number}. " data-number="${number}">${parseInlineMarkdown(content) || '<br>'}</li>`);
          i++;
        }
        elements.push(`<ul class="markdown-list-numbered">${listItems.join('')}</ul>`);
      }
      // Check for bullet lists (- or *)
      else if (line.match(/^[\-\*]\s+/)) {
        // Collect all consecutive bullet list items
        const listItems = [];
        while (i < lines.length && lines[i].match(/^[\-\*]\s+/)) {
          const content = lines[i].replace(/^[\-\*]\s+/, '');
          listItems.push(`<li class="markdown-li" data-prefix="- ">${parseInlineMarkdown(content) || '<br>'}</li>`);
          i++;
        }
        elements.push(`<ul class="markdown-list">${listItems.join('')}</ul>`);
      }
      // Check for code blocks
      else if (line.startsWith('```')) {
        const language = line.slice(3).trim();
        elements.push(`<pre class="markdown-pre" data-prefix="\`\`\`${language}">${escapeHtml(language)}</pre>`);
        i++;
      }
      // Regular paragraph
      else {
        elements.push(`<p class="markdown-p">${parseInlineMarkdown(line) || '<br>'}</p>`);
        i++;
      }
    }

    const html = elements.join('');
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

  const getMarkdownPrefix = (nodeName, element) => {
    if (nodeName === 'H1') return '# ';
    if (nodeName === 'H2') return '## ';
    if (nodeName === 'H3') return '### ';
    if (nodeName === 'LI') {
      // Check if it's numbered or bullet
      if (element && element.classList && element.classList.contains('markdown-li-numbered')) {
        const number = element.dataset.number || '1';
        return number + '. ';
      }
      return '- ';
    }
    if (nodeName === 'PRE') {
      if (element && element.dataset.prefix) {
        return element.dataset.prefix;
      }
      return '```';
    }
    return '';
  };

  const extractTextWithMarkdown = (node) => {
    let result = '';

    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.textContent;
      } else if (child.nodeName === 'STRONG') {
        result += '**' + child.textContent + '**';
      } else if (child.nodeName === 'EM') {
        result += '*' + child.textContent + '*';
      } else if (child.nodeName === 'CODE') {
        result += '`' + child.textContent + '`';
      } else if (child.nodeName === 'BR') {
        result += '';
      } else {
        result += child.textContent;
      }
    });

    return result;
  };

  const getPlainText = () => {
    if (!editorRef.current) return '';

    const children = Array.from(editorRef.current.childNodes);
    return children.map(node => {
      // Add markdown syntax based on the element type
      if (node.nodeName === 'H1') {
        const text = extractTextWithMarkdown(node);
        return '# ' + text;
      } else if (node.nodeName === 'H2') {
        const text = extractTextWithMarkdown(node);
        return '## ' + text;
      } else if (node.nodeName === 'H3') {
        const text = extractTextWithMarkdown(node);
        return '### ' + text;
      } else if (node.nodeName === 'UL') {
        // Extract all list items
        const listItems = Array.from(node.children);
        return listItems.map(li => {
          const text = extractTextWithMarkdown(li);
          if (li.dataset.number) {
            return li.dataset.number + '. ' + text;
          }
          return '- ' + text;
        }).join('\n');
      } else if (node.nodeName === 'PRE') {
        const text = extractTextWithMarkdown(node);
        if (node.dataset.prefix) {
          return node.dataset.prefix;
        }
        return '```' + text;
      } else if (node.nodeName === 'P' || node.nodeName === 'DIV') {
        const text = extractTextWithMarkdown(node);
        return text;
      }
      return extractTextWithMarkdown(node);
    }).join('\n');
  };

  const handleInput = () => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    const text = getPlainText();

    // Trigger onChange to update parent
    onChange({ target: { value: text } });

    // Cancel any pending animation frame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // Re-render with formatting immediately
    rafIdRef.current = requestAnimationFrame(() => {
      // Only render if component is still mounted
      if (isMountedRef.current && editorRef.current) {
        renderContent(text);
      }
      isUpdatingRef.current = false;
      rafIdRef.current = null;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Get current selection
      const selection = window.getSelection();
      if (!selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const currentNode = range.startContainer;
      const element = currentNode.nodeType === Node.TEXT_NODE ? currentNode.parentElement : currentNode;

      if (!element || !element.closest('[contenteditable]')) return;

      const parent = element.closest('h1, h2, h3, p, li, pre') || element;
      if (!parent || !parent.parentNode) return;

      // Check if we're in a list item
      if (parent.nodeName === 'LI') {
        const ul = parent.parentElement;

        // If it's an empty list item, exit the list and create a paragraph
        if (!parent.textContent.trim()) {
          // Remove the empty list item
          parent.remove();

          // Create a new paragraph after the UL
          const newP = document.createElement('p');
          newP.className = 'markdown-p';
          newP.innerHTML = '<br>';
          ul.parentNode.insertBefore(newP, ul.nextSibling);

          // Move cursor to new paragraph
          const newRange = document.createRange();
          newRange.setStart(newP, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          // Continue the list
          const newLi = document.createElement('li');

          // Determine if it's a numbered or bullet list
          if (parent.classList.contains('markdown-li-numbered')) {
            // Get the next number
            const currentNumber = parseInt(parent.dataset.number || '1', 10);
            const nextNumber = currentNumber + 1;
            newLi.className = 'markdown-li-numbered';
            newLi.dataset.number = nextNumber.toString();
            newLi.dataset.prefix = nextNumber + '. ';
          } else {
            // Bullet list
            newLi.className = 'markdown-li';
            newLi.dataset.prefix = '- ';
          }
          newLi.innerHTML = '<br>';

          // Insert after the current LI
          parent.parentNode.insertBefore(newLi, parent.nextSibling);

          // Move cursor to new LI
          const newRange = document.createRange();
          newRange.setStart(newLi, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        // For all other elements, create a new paragraph
        const newP = document.createElement('p');
        newP.className = 'markdown-p';
        newP.innerHTML = '<br>';
        parent.parentNode.insertBefore(newP, parent.nextSibling);

        // Move cursor to new paragraph
        const newRange = document.createRange();
        newRange.setStart(newP, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      handleInput();
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

  // Cleanup effect
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Cancel any pending animation frame on unmount
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

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
