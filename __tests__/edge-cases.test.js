const testFunctions = require('./test-functions');

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = '';
    
    delete window.location;
    window.location = {
      hostname: 'localhost',
      href: 'http://localhost:3000/test'
    };
  });
  
  describe('isLocalUrl', () => {
    test('should detect localhost variants', () => {
      const localUrls = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0'
      ];
      
      localUrls.forEach(hostname => {
        window.location.hostname = hostname;
        expect(testFunctions.isLocalUrl()).toBe(true);
      });
    });
    
    test('should detect private IP ranges', () => {
      const privateIps = [
        '192.168.1.1',
        '192.168.0.100',
        '10.0.0.1',
        '10.255.255.255',
        '172.16.0.1',
        '172.31.255.255'
      ];
      
      privateIps.forEach(hostname => {
        window.location.hostname = hostname;
        expect(testFunctions.isLocalUrl()).toBe(true);
      });
    });
    
    test('should reject public URLs', () => {
      const publicUrls = [
        'example.com',
        'github.com',
        '8.8.8.8',
        '172.15.0.1', // Outside private range
        '172.32.0.1'  // Outside private range
      ];
      
      publicUrls.forEach(hostname => {
        window.location.hostname = hostname;
        expect(testFunctions.isLocalUrl()).toBe(false);
      });
    });
  });
  
  describe('Malformed HTML handling', () => {
    test('should handle missing error type gracefully', () => {
      document.title = 'Some Error Page';
      document.body.innerHTML = `
        <p>Something went wrong but no Rails error pattern</p>
        <p>Rails.root: /app</p>
      `;
      
      const result = testFunctions.extractRailsError();
      expect(result).toContain('URL: http://localhost:3000/test');
      expect(result).not.toContain('Rails Error:');
    });
    
    test('should handle missing code context', () => {
      document.title = 'NameError in TestController#test';
      document.body.innerHTML = `
        <h1>NameError in TestController#test</h1>
        <p>undefined method 'test'</p>
        <p>Rails.root: /app</p>
      `;
      
      const result = testFunctions.extractRailsError();
      expect(result).toContain('Rails Error: NameError');
      expect(result).toContain('Message: undefined method \'test\'');
      expect(result).not.toContain('Code Context:');
    });
    
    test('should handle missing stack trace', () => {
      document.title = 'NameError in TestController#test';
      document.body.innerHTML = `
        <h1>NameError in TestController#test</h1>
        <p>undefined method 'test'</p>
      `;
      
      const result = testFunctions.extractRailsError();
      expect(result).toContain('Rails Error: NameError');
      expect(result).not.toContain('Stack Trace:');
    });
  });
  
  describe('Empty and invalid content', () => {
    test('should handle completely empty body', () => {
      document.title = 'Error Page';
      document.body.innerHTML = '';
      
      const result = testFunctions.extractRailsError();
      expect(result).toContain('URL: http://localhost:3000/test');
      expect(typeof result).toBe('string');
    });
    
    test('should handle body with only whitespace', () => {
      document.title = 'Error Page';
      document.body.innerHTML = '   \n\n   \t  ';
      
      const result = testFunctions.extractRailsError();
      expect(result).toContain('URL: http://localhost:3000/test');
    });
    
    test('should handle very long content gracefully', () => {
      const longContent = 'A'.repeat(10000);
      document.body.innerHTML = `<p>${longContent}</p>`;
      
      const result = testFunctions.extractPageContent();
      expect(result.length).toBeLessThan(15000); // Should be truncated
      expect(result).toContain('[Content truncated...]');
    });
  });
  
  describe('Mixed error patterns', () => {
    test('should handle multiple error patterns in same page', () => {
      document.title = 'NameError in TestController#test';
      document.body.innerHTML = `
        <h1>NameError in TestController#test</h1>
        <p>undefined method 'first_method'</p>
        <p>No route matches [GET] "/invalid"</p>
        <p>wrong number of arguments (given 1, expected 0)</p>
      `;
      
      const result = testFunctions.extractRailsError();
      // Should pick the first matching pattern
      expect(result).toContain('Message: undefined method \'first_method\'');
      expect(result).not.toContain('No route matches');
    });
  });
  
  describe('Special characters and encoding', () => {
    test('should handle special characters in error messages', () => {
      document.title = 'NameError in TestController#test';
      document.body.innerHTML = `
        <h1>NameError in TestController#test</h1>
        <p>undefined method 'tëst_méthød' for #&lt;User:0x123&gt;</p>
      `;
      
      const result = testFunctions.extractRailsError();
      expect(result).toContain('Rails Error: NameError');
      expect(result).toContain('undefined method \'tëst_méthød\'');
    });
    
    test('should handle HTML entities in code', () => {
      document.title = 'ActionView::MissingTemplate in TestController#test';
      document.body.innerHTML = `
        <h1>ActionView::MissingTemplate in TestController#test</h1>
        <table class="source_code">
          <tr>
            <td class="line_number">5</td>
            <td class="code">&lt;%= link_to "Test", test_path %&gt;</td>
          </tr>
        </table>
      `;
      
      const result = testFunctions.extractRailsError();
      expect(result).toContain('Code Context:');
      expect(result).toContain('<%= link_to "Test", test_path %>');
    });
  });
  
  describe('Browser compatibility', () => {
    test('should handle missing clipboard API', () => {
      delete navigator.clipboard;
      
      // This would be tested in the browser extension context
      // For now, just ensure the functions don't crash
      expect(() => testFunctions.extractRailsError()).not.toThrow();
    });
    
    test('should handle missing selection API', () => {
      delete window.getSelection;
      
      const result = testFunctions.extractPageContent();
      expect(typeof result).toBe('string');
    });
  });
});