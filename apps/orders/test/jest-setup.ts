// Suppress console.error and Logger errors in tests
// These are expected errors from testing error handling paths

const originalError = console.error;

beforeAll(() => {
  console.error = (...args: any[]) => {
    // Suppress NestJS Logger errors that are expected in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Failed to process') ||
       args[0].includes('ERROR ['))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
