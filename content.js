// CopyToLLM - Content Script
(function() {
  'use strict';

  // Check if we're on a Rails error page
  function isRailsErrorPage() {
    const title = document.title.toLowerCase();
    const body = document.body.textContent;
    
    return (title.includes('error') || title.includes('exception') || title.includes('template')) &&
           (body.includes('Rails.root:') || body.includes('Application Trace') || 
            body.includes('Extracted source'));
  }

  // Extract Rails error information
  function extractRailsError() {
    const result = [];
    const bodyText = document.body.innerText;
    const lines = bodyText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Get error type and location
    let errorType = '';
    let errorLocation = '';
    let errorMessage = '';
    let errorFile = '';
    let errorLineNum = '';
    
    // Find error type (e.g., "NameError in Projects#index" or "ActionView::MissingTemplate in Projects::Integrations#show")
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      // Updated regex to capture namespaced errors like ActionView::MissingTemplate
      const errorMatch = line.match(/^([\w:]+(?:Error|Template))\s+in\s+(.+)$/);
      if (errorMatch) {
        errorType = errorMatch[1];
        errorLocation = errorMatch[2];
        break;
      }
    }
    
    // Find the error message
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for common error patterns
      if (line.startsWith('undefined method') || 
          line.startsWith('undefined local variable') ||
          line.startsWith('No route matches') ||
          line.startsWith('wrong number of arguments') ||
          line.includes('uninitialized constant') ||
          line.startsWith('Missing partial') ||
          line.startsWith('Missing template') ||
          line.startsWith('No view template for interactive request')) {
        errorMessage = line;
        break;
      }
    }
    
    // Find file path from "Showing ..." line
    const showingIndex = lines.findIndex(line => line.startsWith('Showing'));
    if (showingIndex !== -1) {
      const showingMatch = lines[showingIndex].match(/Showing\s+(.+?)\s+where\s+line\s+#?(\d+)/);
      if (showingMatch) {
        errorFile = showingMatch[1];
        errorLineNum = showingMatch[2];
      }
    }
    
    // Start building formatted output
    if (errorType) {
      result.push(`Rails Error: ${errorType}`);
    }
    
    if (errorFile && errorLineNum) {
      result.push(`File: ${errorFile}:${errorLineNum}`);
    }
    
    if (errorMessage) {
      result.push(`Message: ${errorMessage}`);
    }
    
    // For MissingTemplate errors, extract search paths
    if (errorType && errorType.includes('MissingTemplate')) {
      const searchedInIndex = lines.findIndex(line => line === 'Searched in:');
      if (searchedInIndex !== -1) {
        result.push('');
        result.push('Template Search Paths:');
        
        // Get all the paths that were searched
        for (let i = searchedInIndex + 1; i < lines.length && i < searchedInIndex + 20; i++) {
          const line = lines[i];
          
          // Stop if we hit another section
          if (line.includes('Extracted source') || line.includes('Rails.root:') || 
              line.includes('Application Trace') || !line.startsWith('*')) {
            break;
          }
          
          // Add the search path
          if (line.startsWith('* ')) {
            result.push(`  ${line.substring(2).trim()}`);
          }
        }
      }
    }
    
    // Extract code context
    const extractedSourceIndex = lines.findIndex(line => 
      line.includes('Extracted source')
    );
    
    if (extractedSourceIndex !== -1) {
      result.push('');
      result.push('Code Context:');
      
      let codeLines = [];
      let foundErrorLine = false;
      
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
              // Check if this is the error line
              if (lineNum === errorLineNum) {
                codeLines.push(`${lineNum}: > ${nextLine}`);
                foundErrorLine = true;
              } else {
                codeLines.push(`${lineNum}:   ${nextLine}`);
              }
              i++; // Skip the code line we just processed
            }
          }
        }
      }
      
      // Add code lines to result
      for (const codeLine of codeLines) {
        result.push(codeLine);
      }
    }
    
    // Extract stack trace
    const traceIndex = lines.findIndex(line => line === 'Application Trace');
    if (traceIndex !== -1) {
      result.push('');
      result.push('Stack Trace:');
      
      // Get the first few trace lines
      for (let i = traceIndex + 1; i < lines.length && i < traceIndex + 5; i++) {
        const line = lines[i];
        if (line && !line.includes('Framework Trace') && !line.includes('Full Trace')) {
          // Clean up the trace line
          const cleanedLine = line.replace(/^\s*/, '').replace(/:in\s+`(.+?)'$/, ':in `$1`');
          if (cleanedLine.includes('app/')) {
            result.push(`- ${cleanedLine}`);
          }
        }
      }
    }
    
    // Add URL at the end
    result.push('');
    result.push(`URL: ${window.location.href}`);
    
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

  // Check if current URL is a local development URL
  function isLocalUrl() {
    const hostname = window.location.hostname;
    
    // Check for localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
      return true;
    }
    
    // Check for private IP ranges
    if (hostname.startsWith('192.168.')) {
      return true;
    }
    
    if (hostname.startsWith('10.')) {
      return true;
    }
    
    // Check for 172.16.0.0 - 172.31.255.255 range
    const ip172Match = hostname.match(/^172\.(\d+)\./);
    if (ip172Match) {
      const secondOctet = parseInt(ip172Match[1]);
      return secondOctet >= 16 && secondOctet <= 31;
    }
    
    return false;
  }

  // Initialize the extension
  function init() {
    // Only run on local URLs
    if (!isLocalUrl()) {
      return;
    }
    
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