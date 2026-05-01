/**
 * Test Runner for Property Service Tests
 * 
 * Runs unit tests for the property service without requiring a full testing framework.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock jest functions
global.jest = {
  fn: () => {
    const mockFn = (...args) => {
      mockFn.calls.push(args);
      if (mockFn.implementation) {
        return mockFn.implementation(...args);
      }
      if (mockFn._mockReturnValue !== undefined) {
        return mockFn._mockReturnValue;
      }
      if (mockFn._mockResolvedValue !== undefined) {
        return Promise.resolve(mockFn._mockResolvedValue);
      }
      if (mockFn._mockRejectedValue !== undefined) {
        return Promise.reject(mockFn._mockRejectedValue);
      }
    };
    mockFn.calls = [];
    mockFn._mockReturnValue = undefined;
    mockFn._mockResolvedValue = undefined;
    mockFn._mockRejectedValue = undefined;
    mockFn.implementation = undefined;
    
    mockFn.mockImplementation = (fn) => {
      mockFn.implementation = fn;
      return mockFn;
    };
    mockFn.mockReturnValue = (value) => {
      mockFn._mockReturnValue = value;
      return mockFn;
    };
    mockFn.mockResolvedValue = (value) => {
      mockFn._mockResolvedValue = value;
      return mockFn;
    };
    mockFn.mockRejectedValue = (value) => {
      mockFn._mockRejectedValue = value;
      return mockFn;
    };
    return mockFn;
  },
  clearAllMocks: () => {
    // Reset all mocks
    if (global.mockApiService) {
      Object.keys(global.mockApiService).forEach(key => {
        if (typeof global.mockApiService[key] === 'function' && global.mockApiService[key].calls) {
          global.mockApiService[key].calls = [];
          global.mockApiService[key]._mockReturnValue = undefined;
          global.mockApiService[key]._mockResolvedValue = undefined;
          global.mockApiService[key]._mockRejectedValue = undefined;
          global.mockApiService[key].implementation = undefined;
        }
      });
    }
  },
  mock: (modulePath, factory) => {
    // Store the mock factory
    if (!global.mockModules) {
      global.mockModules = {};
    }
    global.mockModules[modulePath] = factory();
  }
};

let testsPassed = 0;
let testsFailed = 0;
let currentDescribe = '';

global.describe = (name, fn) => {
  currentDescribe = name;
  console.log(`\n📁 ${name}`);
  fn();
};

global.test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
    testsFailed++;
  }
};

global.beforeEach = (fn) => {
  // Store for execution before each test
  if (!global.beforeEachFns) {
    global.beforeEachFns = [];
  }
  global.beforeEachFns.push(fn);
};

global.expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toEqual: (expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
    }
  },
  toBeNull: () => {
    if (actual !== null) {
      throw new Error(`Expected ${actual} to be null`);
    }
  },
  toHaveBeenCalledWith: (...args) => {
    if (!actual.calls) {
      throw new Error('Expected a mock function');
    }
    const found = actual.calls.some(call => 
      call.length === args.length && 
      call.every((arg, i) => JSON.stringify(arg) === JSON.stringify(args[i]))
    );
    if (!found) {
      throw new Error(`Expected function to have been called with ${JSON.stringify(args)}, but was called with ${JSON.stringify(actual.calls)}`);
    }
  }
});

// Run the tests
console.log('🧪 Running Property Service Tests...\n');

try {
  // Import the actual property service
  const propertyServiceModule = await import('./src/services/propertyService.js');
  const propertyService = propertyServiceModule.default;
  
  // Create mock API service
  const mockApiService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn()
  };
  global.mockApiService = mockApiService;
  
  // Mock the module
  jest.mock('../api.js', () => mockApiService);
  
  // Read and execute the test file
  const testFile = join(__dirname, 'src/services/__tests__/propertyService.test.js');
  const testCode = readFileSync(testFile, 'utf8');
  
  // Replace imports with our mocked versions
  const modifiedTestCode = testCode
    .replace(/import propertyService from '\.\.\/propertyService\.js';/, `const propertyService = ${JSON.stringify(propertyService)};`)
    .replace(/import apiService from '\.\.\/api\.js';/, 'const apiService = global.mockApiService;')
    .replace(/jest\.mock\('\.\.\/api\.js'.*\);/, '// Mock already set up')
    .replace(/if \(typeof module.*[\s\S]*$/, ''); // Remove module.exports
  
  // Execute tests
  eval(modifiedTestCode);
  
  console.log(`\n✨ Tests completed: ${testsPassed} passed, ${testsFailed} failed`);
  
  if (testsFailed > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error('\n💥 Test execution failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
