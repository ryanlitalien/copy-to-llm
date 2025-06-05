// CopyToLLM - Content Script
(function() {
  'use strict';

  // Check if we're on a Rails error page
  function isRailsErrorPage() {
    const title = document.title.toLowerCase();
    const body = document.body.textContent;
    
    return (title.includes('error') || title.includes('exception')) &&
           (body.includes('Rails.root:') || body.includes('Application Trace') || 
            body.includes('Extracted source'));
  }

  // Extract Rails error information
  function extractRailsError() {
    const result = [];
    const bodyText = document.body.innerText;
    const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Always include the URL for context
    result.push(`URL: ${window.location.href}`);
    result.push('');
    
    // Get error type - could be in first or second line
    let errorTypeFound = false;
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      if (line.includes('Error')) {
        // Check for "ErrorType in Controller#action" format
        const errorMatch = line.match(/^(\w+Error)\s+in\s+(.+)$/);
        if (errorMatch) {
          result.push(`Error: ${errorMatch[1]}`);
          result.push(`Location: ${errorMatch[2]}`);
        } else {
          // Just an error type like "Routing Error"
          result.push(`Error: ${line}`);
        }
        errorTypeFound = true;
        break;
      }
    }
    
    // Get the error message/details
    let messageFound = false;
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];
      
      // Skip the error type line we already processed
      if (errorTypeFound && line.includes('Error') && i < 3) {
        continue;
      }
      
      // Common error message patterns
      if (line.startsWith('No route matches') ||
          line.startsWith('undefined method') || 
          line.startsWith('wrong number of arguments') ||
          line.includes('uninitialized constant') ||
          line.includes('ActiveRecord::RecordNotFound') ||
          line.includes('ActionController::') ||
          (line.length > 10 && !line.includes('Extracted source') && 
           !line.includes('Rails.root') && !line.includes('Application Trace'))) {
        
        // For routing errors, include the full message
        if (line.startsWith('No route matches')) {
          result.push(`Message: ${line}`);
        } else {
          // For other errors, truncate at "for #<" to avoid object dumps
          const errorMsg = line.split(' for #<')[0] || line.split(' for ')[0] || line;
          result.push(`Message: ${errorMsg.trim()}`);
        }
        messageFound = true;
        break;
      }
    }
    
    // Find the Application Trace section to get file and line
    const traceIndex = lines.findIndex(line => line === 'Application Trace');
    if (traceIndex !== -1 && traceIndex + 1 < lines.length) {
      const traceLine = lines[traceIndex + 1];
      const match = traceLine.match(/app\/(.+?):(\d+):/);
      if (match) {
        result.push(`\nFile: app/${match[1]}:${match[2]}`);
      }
    }
    
    // Extract the problematic line of code (if it exists)
    const extractedSourceIndex = lines.findIndex(line => 
      line.includes('Extracted source')
    );
    
    if (extractedSourceIndex !== -1) {
      // Look for the code section
      let codeLines = [];
      
      for (let i = extractedSourceIndex + 1; i < lines.length && i < extractedSourceIndex + 20; i++) {
        const line = lines[i];
        
        // Stop if we hit Rails.root or other sections
        if (line.includes('Rails.root:') || line.includes('Application Trace')) {
          break;
        }
        
        // Check if this is a line number
        if (/^\d+$/.test(line)) {
          const lineNum = line;
          // Check if the next line exists and is code
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            // Skip if next line is also just a number
            if (!/^\d+$/.test(nextLine) && !nextLine.includes('Rails.root:')) {
              codeLines.push(`${lineNum}: ${nextLine}`);
              i++; // Skip the code line we just processed
            }
          }
        }
      }
      
      // Find the error line (usually the middle one)
      if (codeLines.length > 0) {
        const errorLine = codeLines[Math.floor(codeLines.length / 2)];
        if (errorLine) {
          result.push(`Code: ${errorLine}`);
        }
      }
    }
    
    // If we didn't find much info, include more raw content
    if (result.length <= 3) {
      result.push('\nRaw content:');
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (!lines[i].includes('Toggle') && !lines[i].includes('📋')) {
          result.push(lines[i]);
        }
      }
    }
    
    return result.join('\n');
  }

  // Extract general page content intelligently
  function extractPageContent() {
    // For Rails errors, use specialized extraction
    if (isRailsErrorPage()) {
      return extractRailsError();
    }
    
    // For other pages, try to get the main content
    let content = '';
    
    // Try to find main content areas
    const mainSelectors = [
      'main', 
      'article', 
      '[role="main"]', 
      '#main-content',
      '.main-content',
      '#content',
      '.content'
    ];
    
    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim().length > 100) {
        content = element.innerText.trim();
        break;
      }
    }
    
    // If no main content found, try to get selected text or use body
    if (!content) {
      const selection = window.getSelection().toString().trim();
      if (selection && selection.length > 20) {
        content = selection;
      } else {
        // Get body text but limit it
        content = document.body.innerText.trim();
        if (content.length > 5000) {
          content = content.substring(0, 5000) + '\n\n[Content truncated...]';
        }
      }
    }
    
    // Add page title and URL for context
    const pageInfo = [
      `Page Title: ${document.title}`,
      `URL: ${window.location.href}`,
      '',
      content
    ];
    
    return pageInfo.join('\n');
  }

  // Copy text to clipboard
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '-999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  }

  // Create and inject the copy button
  function createCopyButton() {
    const button = document.createElement('button');
    button.id = 'copy-to-llm-btn';
    button.textContent = '📋 Copy to LLM';
    button.title = 'Copy page content for sharing with AI assistants';
    
    button.addEventListener('click', async () => {
      const content = extractPageContent();
      
      if (content) {
        const success = await copyToClipboard(content);
        if (success) {
          button.textContent = '✅ Copied!';
          button.classList.add('success');
          setTimeout(() => {
            button.textContent = '📋 Copy to LLM';
            button.classList.remove('success');
          }, 2000);
        }
      } else {
        button.textContent = '❌ No content found';
        setTimeout(() => {
          button.textContent = '📋 Copy to LLM';
        }, 2000);
      }
    });
    
    document.body.appendChild(button);
  }

  // Initialize the extension
  function init() {
    // Small delay to ensure page is fully loaded
    setTimeout(createCopyButton, 100);
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();