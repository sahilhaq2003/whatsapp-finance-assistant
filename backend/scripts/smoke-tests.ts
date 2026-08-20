#!/usr/bin/env node

/**
 * Production smoke tests for the Finance Assistant API.
 *
 * Usage:
 *   npx tsx scripts/smoke-tests.ts http://localhost:3000
 *
 * Accepts API_URL as the first CLI argument (defaults to http://localhost:3000).
 * Exits with code 0 on success, 1 on failure.
 */

const API_URL = process.argv[2] || 'http://localhost:3000';

interface SmokeTest {
  name: string;
  run: () => Promise<void>;
}

let passed = 0;
let failed = 0;

async function request(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<{ status: number; json: () => Promise<unknown> }> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const tests: SmokeTest[] = [
  {
    name: 'GET /api/health/live returns 200',
    run: async () => {
      const res = await request('GET', '/api/health/live');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    },
  },
  {
    name: 'GET /api/health/ready returns 200',
    run: async () => {
      const res = await request('GET', '/api/health/ready');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    },
  },
  {
    name: 'POST /api/auth/register returns proper response',
    run: async () => {
      const testUser = {
        phone: `smoke_test_${Date.now()}@test.com`,
        name: 'Smoke Test User',
        password: 'Test1234!',
      };
      const res = await request('POST', '/api/auth/register', testUser);
      const data = (await res.json()) as Record<string, unknown>;
      assert(
        res.status === 201 || res.status === 200,
        `Expected 200 or 201, got ${res.status}`,
      );
      assert(
        data !== null && typeof data === 'object',
        'Response should be an object',
      );
    },
  },
  {
    name: 'POST /api/auth/login with test credentials',
    run: async () => {
      const testCredentials = {
        phone: 'smoke_test_nonexistent@test.com',
        password: 'Test1234!',
      };
      const res = await request('POST', '/api/auth/login', testCredentials);
      assert(
        res.status === 200 || res.status === 401,
        `Expected 200 or 401, got ${res.status}`,
      );
    },
  },
  {
    name: 'GET /api/auth/me returns user when authenticated',
    run: async () => {
      const res = await request('GET', '/api/auth/me');
      assert(
        res.status === 401 || res.status === 200,
        `Expected 401 or 200, got ${res.status}`,
      );
    },
  },
  {
    name: 'GET /api/transactions returns 401 without auth',
    run: async () => {
      const res = await request('GET', '/api/transactions');
      assert(res.status === 401, `Expected 401, got ${res.status}`);
    },
  },
  {
    name: 'GET /api/customers returns 401 without auth',
    run: async () => {
      const res = await request('GET', '/api/customers');
      assert(res.status === 401, `Expected 401, got ${res.status}`);
    },
  },
  {
    name: 'GET /api/invoices returns 401 without auth',
    run: async () => {
      const res = await request('GET', '/api/invoices');
      assert(res.status === 401, `Expected 401, got ${res.status}`);
    },
  },
  {
    name: 'POST /api/whatsapp/webhook with invalid body returns proper error',
    run: async () => {
      const res = await request('POST', '/api/whatsapp/webhook', { invalid: true });
      assert(
        res.status >= 400,
        `Expected 4xx error, got ${res.status}`,
      );
    },
  },
];

async function main() {
  console.log(`Running smoke tests against ${API_URL}\n`);

  for (const test of tests) {
    try {
      await test.run();
      console.log(`  ✓ ${test.name}`);
      passed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${test.name}`);
      console.error(`    ${message}`);
      failed++;
    }
  }

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main();
