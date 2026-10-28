import { describe, expect, it } from 'vitest';

import { MAX_BODY_BYTES } from './app';
import { buildTestApp } from './test-utils';

describe('GET /health', () => {
  it('returns 200 when the database answers', async () => {
    const res = await buildTestApp().request('/health');

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: 'ok',
      version: 'test',
      database: { status: 'up' },
    });
  });

  it('returns 503 when the database ping fails', async () => {
    const app = buildTestApp({ pingDatabase: () => Promise.reject(new Error('down')) });
    const res = await app.request('/health');

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: 'degraded',
      database: { status: 'down', latencyMs: null },
    });
  });

  it('returns 503 when the database does not answer in time', async () => {
    const app = buildTestApp({
      pingDatabase: () => new Promise(() => undefined),
      databaseTimeoutMs: 20,
    });
    const res = await app.request('/health');

    expect(res.status).toBe(503);
  });

  it('does not require a session', async () => {
    const res = await buildTestApp().request('/health');
    expect(res.status).not.toBe(401);
  });
});

describe('API documentation', () => {
  it('serves the OpenAPI document with /health', async () => {
    const res = await buildTestApp().request('/openapi.json');
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown> };

    expect(res.status).toBe(200);
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.paths).toHaveProperty('/health');
  });

  it('serves the Scalar reference on /docs', async () => {
    const res = await buildTestApp().request('/docs');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain('/openapi.json');
  });
});

describe('cross-cutting behaviour', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const res = await buildTestApp().request('/nope');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'not_found', message: 'Route not found' },
    });
  });

  it('sets security headers and a request id', async () => {
    const res = await buildTestApp().request('/health');

    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(res.headers.get('x-request-id')).toBeTruthy();
  });

  it('rejects bodies over the size limit', async () => {
    const res = await buildTestApp().request('/health', {
      method: 'POST',
      body: 'x'.repeat(MAX_BODY_BYTES + 1),
    });

    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({ error: { code: 'payload_too_large' } });
  });
});
