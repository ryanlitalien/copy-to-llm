// Extracted functions from content.js for testing
// These are copies of the functions from the IIFE to make them testable

// Check if we're on a Rails error page
function isRailsErrorPage() {
  const title = document.title.toLowerCase();
  const body = document.body.textContent || '';
  
  return (title.includes('error') || title.includes('exception') || title.includes('template')) &&
         (body.includes('Rails.root:') || body.includes('Application Trace') || 
          body.includes('Extracted source'));
}

// Extract Rails error information
function extractRailsError() {
  const result = [];
  const bodyText = document.body.innerText || document.body.textContent || '';
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
        line.startsWith('No view template for interactive request') ||
        line.startsWith('Before process_action callback') ||
        line.includes('has not been defined')) {
      errorMessage = line;
      break;
    }
  }
  
  // Find file path and line number from "Showing ..." line or "Extracted source" line
  const showingIndex = lines.findIndex(line => line.startsWith('Showing'));
  if (showingIndex !== -1) {
    const showingMatch = lines[showingIndex].match(/Showing\s+(.+?)\s+where\s+line\s+#?(\d+)/);
    if (showingMatch) {
      errorFile = showingMatch[1];
      errorLineNum = showingMatch[2];
    }
  } else {
    // Try to extract from "Extracted source (around line #X):" pattern
    const extractedIndex = lines.findIndex(line => line.includes('Extracted source'));
    if (extractedIndex !== -1) {
      const extractedMatch = lines[extractedIndex].match(/Extracted source.*line\s+#?(\d+)/);
      if (extractedMatch) {
        errorLineNum = extractedMatch[1];
      }
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
  
  // Extract code context - improved extraction for Rails error pages
  let codeExtracted = false;
  
  // Try DOM-based extraction first
  const codeTable = document.querySelector('table.source_code, .source_code table, pre.source_code');
  if (codeTable) {
    result.push('');
    result.push('Code Context:');
    
    const rows = codeTable.querySelectorAll('tr');
    rows.forEach(row => {
      const lineNumCell = row.querySelector('td.line_number, .line_number, th');
      const codeCell = row.querySelector('td.code, .code, td:last-child');
      
      if (lineNumCell && codeCell) {
        const lineNum = lineNumCell.textContent.trim();
        const codeText = codeCell.textContent.trim();
        
        if (lineNum === errorLineNum) {
          result.push(`${lineNum}:   > ${codeText}`);
        } else if (codeText) {
          result.push(`${lineNum}:     ${codeText}`);
        }
      }
    });
    codeExtracted = true;
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
    if (element && (element.innerText || element.textContent || '').trim().length > 100) {
      content = (element.innerText || element.textContent || '').trim();
      break;
    }
  }
  
  // If no main content found, try to get selected text or use body
  if (!content) {
    const selection = window.getSelection ? window.getSelection().toString().trim() : '';
    if (selection && selection.length > 20) {
      content = selection;
    } else {
      // Get body text but limit it
      content = (document.body.innerText || document.body.textContent || '').trim();
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

module.exports = {
  isRailsErrorPage,
  extractRailsError,
  extractPageContent,
  isLocalUrl
};