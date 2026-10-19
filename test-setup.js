// Test setup for browser extension environment
global.navigator = {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve())
  }
};

global.window = {
  location: {
    hostname: 'localhost',
    href: 'http://localhost:3000/test'
  },
  getSelection: () => ({
    toString: () => ''
  })
};

global.document.execCommand = jest.fn();

// Polyfill for innerText in JSDOM
Object.defineProperty(global.Element.prototype, 'innerText', {
  get() {
    return this.textContent;
  },
  set(value) {
    this.textContent = value;
  }
});