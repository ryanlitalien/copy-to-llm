# CopyToLLM Rails Error Extraction Tests

This test suite validates the Rails error extraction functionality in the CopyToLLM browser extension.

## Test Structure

### Test Files

- `__tests__/rails-error-extraction.test.js` - Main test suite for Rails error extraction
- `__tests__/edge-cases.test.js` - Edge cases and error handling tests
- `__tests__/test-functions.js` - Extracted functions from content.js for testing
- `__tests__/fixtures/` - HTML fixtures representing different Rails error types

### Test Fixtures

The test suite includes realistic HTML fixtures for various Rails error types:

1. **name-error.html** - NameError with undefined method
2. **missing-template.html** - ActionView::MissingTemplate with search paths  
3. **argument-error.html** - ArgumentError with callback not defined
4. **no-view-template.html** - ActionController::MissingExactTemplate

Each fixture contains:
- Proper Rails error page structure
- Error type and location in title/header
- Error message
- Code context (table or pre format)
- Stack trace
- Template search paths (for MissingTemplate errors)

## Test Coverage

### Rails Error Detection
- ✅ Detects Rails error pages correctly
- ✅ Rejects non-Rails pages  
- ✅ Handles various error title formats

### Error Information Extraction
- ✅ Extracts error type (NameError, ActionView::MissingTemplate, etc.)
- ✅ Extracts error location (Controller#action)
- ✅ Extracts error messages
- ✅ Extracts file paths and line numbers
- ✅ Extracts code context from both table and pre structures
- ✅ Extracts stack traces
- ✅ Extracts template search paths for MissingTemplate errors

### Error Patterns Tested
- `undefined method` calls
- `undefined local variable` 
- `No route matches` routing errors
- `wrong number of arguments`
- `uninitialized constant`
- `Missing partial/template`
- `No view template for interactive request`
- `Before process_action callback ... has not been defined`

### Edge Cases
- ✅ Malformed HTML handling
- ✅ Missing error components (no code context, stack trace, etc.)
- ✅ Empty and whitespace-only content
- ✅ Very long content truncation
- ✅ Special characters and HTML entities
- ✅ Multiple error patterns in same page
- ✅ Browser API compatibility (missing clipboard, selection APIs)
- ✅ Local URL detection for various IP ranges

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test file
npm test __tests__/rails-error-extraction.test.js

# Run tests in watch mode
npm run test:watch

# Run specific test pattern
npm test -- --testNamePattern="NameError"
```

## Test Framework

- **Jest** - Test runner and assertion library
- **JSDOM** - DOM environment for Node.js testing
- **Custom test setup** - Browser extension environment simulation

## Output Validation

The tests validate that extracted Rails errors include:

1. **Error identification**: `Rails Error: [ErrorType]`
2. **File location**: `File: [path]:[line]` (when available)
3. **Error message**: `Message: [error description]`
4. **Code context**: Line-numbered code snippets with error line highlighted
5. **Stack trace**: Application trace entries
6. **Template paths**: Search paths for template errors
7. **URL**: Current page URL

## Example Expected Output

```
Rails Error: NameError
File: /app/controllers/application_controller.rb:15
Message: undefined method `find_by_domain' for Account

Code Context:
13:     def current_account
14:     return unless Jumpstart::Multitenancy.account?
15:   > Account.find_by_domain(request.domain)
16:     end

Stack Trace:
- app/controllers/application_controller.rb:15:in `current_account`
- app/controllers/projects_controller.rb:8:in `index`

URL: http://localhost:3000/projects
```