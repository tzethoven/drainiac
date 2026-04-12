# Testing Guide

This project uses **Vitest** for unit testing. We focus on testing **server-side logic** and **utilities**, not UI components.

## Running Tests

```bash
# Run tests in watch mode (for development)
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Test Structure

Tests are located alongside the code they test in `__tests__` directories:

```
lib/
├── utils.ts
└── __tests__/
    └── utils.test.ts

lib/utils/
├── transcription-store.svelte.ts
└── __tests__/
    └── transcription-store.test.ts
```

## What to Test

### ✅ Do Test

- **Server-side logic** (functions in `+page.server.ts`, `+server.ts`)
- **Form actions** (SvelteKit actions in `+page.server.ts`)
- **Validation Schemas** (Zod schemas)
- **Utility Functions** (pure functions in `src/lib/utils/*.ts`)
- **Rune-based state modules** (`.svelte.ts` files)
- **Business Logic** (data transformations, calculations)
- **Edge Cases** (invalid inputs, boundary conditions)

### ❌ Don't Test

- **Svelte Components** (we're not testing UI)
- **SvelteKit Pages** (`+page.svelte` files)
- **API Endpoints** (covered by integration tests later)
- **Database Queries** (tested with actual DB in integration tests)
- **Browser APIs** (Web Speech API, localStorage - mock these in tests)

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../my-module';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Testing Validations

```typescript
import { describe, it, expect } from 'vitest';
import { MySchema } from '../validations';

describe('MySchema', () => {
  it('should validate valid data', () => {
    const result = MySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid data', () => {
    const result = MySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
    }
  });
});
```

### Testing Rune-based State Modules

For `.svelte.ts` files that use runes, test the exported functions and state behavior:

```typescript
import { describe, it, expect } from 'vitest';
import { createCounter } from '../counter.svelte';

describe('Counter State', () => {
  it('should initialize with default value', () => {
    const counter = createCounter();
    expect(counter.value).toBe(0);
  });

  it('should increment correctly', () => {
    const counter = createCounter();
    counter.increment();
    expect(counter.value).toBe(1);
  });
});
```

### Testing Form Actions

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

describe('Form Actions', () => {
  it('should validate and process form data', async () => {
    const formData = new FormData();
    formData.set('title', 'Test Item');
    
    const event = {
      request: { formData: async () => formData },
      locals: { userId: '123' }
    } as unknown as RequestEvent;
    
    const result = await actions.create(event);
    expect(result.success).toBe(true);
  });
});
```

### Mocking

```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock a module
vi.mock('../external-service', () => ({
  fetchData: vi.fn(() => Promise.resolve({ data: 'mocked' })),
}));

// Mock browser APIs
const mockSpeechRecognition = vi.fn();
global.SpeechRecognition = mockSpeechRecognition as any;
```

### Testing Async/Promises

```typescript
import { describe, it, expect } from 'vitest';

it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

it('should handle promise rejections', async () => {
  await expect(failingFunction()).rejects.toThrow('Error message');
});
```

## Coverage

We aim for:
- **80%+ coverage** for utility functions
- **90%+ coverage** for validation schemas
- **70%+ coverage** for server-side logic (complex ones may need integration tests)

Run coverage report:
```bash
npm run test:coverage
```

## Best Practices

1. **One test file per module** — Keep tests organized
2. **Descriptive test names** — Use "should..." format for clarity
3. **Test edge cases** — Don't just test happy paths
4. **Keep tests simple** — Each test should verify one thing
5. **Avoid testing implementation details** — Test behavior, not internals
6. **Use `.safeParse()` for Zod schemas** — Better for testing than `.parse()`
7. **Mock external dependencies** — Don't let tests depend on browser APIs or external services
8. **Test in isolation** — Each test should be independent

## Vitest Configuration

Vitest is configured in `vite.config.ts` or `vitest.config.ts`. Key settings:

- `globals: true` — Use global test APIs without imports
- `environment: 'node'` — Run tests in Node environment (default)
- `environment: 'jsdom'` — Use for tests that need DOM APIs

## Troubleshooting

### Type Errors

Make sure you have all type definitions installed:
```bash
npm install -D @types/node
```

### Module Resolution Issues

If imports aren't resolving, check your `tsconfig.json` paths and make sure they match your project structure.

### Browser API Errors

Server-side tests run in Node environment. Mock browser APIs:
```typescript
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
} as any;
```

### Rune-related Warnings

When testing `.svelte.ts` files, you may need to mock Svelte's runtime. Generally, test the exported functions rather than the reactive behavior.
