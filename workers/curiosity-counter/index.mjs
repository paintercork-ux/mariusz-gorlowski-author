const INITIAL_NUMBER = 1000;
const VISIT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUTHOR_ORIGINS = new Set(['https://mariuszgorlowski.com', 'https://www.mariuszgorlowski.com']);

function responseHeaders(origin) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';
    const allowedOrigin = AUTHOR_ORIGINS.has(origin)
      || (env.PREVIEW_ORIGIN && origin === env.PREVIEW_ORIGIN);
    if (!allowedOrigin) return new Response('Forbidden', { status: 403 });
    const headers = responseHeaders(origin);
    if (url.pathname !== '/api/curiosity/visit') {
      return new Response('{}', { status: 404, headers });
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    if (request.method !== 'POST') return new Response('{}', { status: 405, headers });
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
      return new Response('{}', { status: 415, headers });
    }
    let body;
    try {
      const text = await request.text();
      if (text.length > 256) return new Response('{}', { status: 413, headers });
      body = JSON.parse(text);
    } catch {
      return new Response('{}', { status: 400, headers });
    }
    if (!body || !VISIT_ID.test(body.visitId ?? '')) {
      return new Response('{}', { status: 400, headers });
    }

    try {
      const id = env.CURIOSITY_COUNTER.idFromName('author-curiosity');
      const object = env.CURIOSITY_COUNTER.get(id);
      const recorded = await object.fetch(new Request('https://counter.internal/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: body.visitId.toLowerCase() }),
      }));
      return new Response(recorded.body, { status: recorded.status, headers });
    } catch {
      return new Response('{}', { status: 503, headers });
    }
  },
};

export class CuriosityCounter {
  constructor(ctx) {
    this.storage = ctx.storage;
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS counter (id INTEGER PRIMARY KEY CHECK (id = 1), value INTEGER NOT NULL)');
    this.sql.exec('INSERT OR IGNORE INTO counter (id, value) VALUES (1, ?)', INITIAL_NUMBER);
    this.sql.exec('CREATE TABLE IF NOT EXISTS visits (visit_id TEXT PRIMARY KEY, number INTEGER NOT NULL UNIQUE)');
  }

  async fetch(request) {
    if (request.method !== 'POST') return new Response('{}', { status: 405 });
    const body = await request.json();
    if (!VISIT_ID.test(body?.visitId ?? '')) return new Response('{}', { status: 400 });
    const number = this.storage.transactionSync(() => {
      const existing = this.sql.exec('SELECT number FROM visits WHERE visit_id = ?', body.visitId).toArray()[0];
      if (existing) return existing.number;
      const next = this.sql.exec('UPDATE counter SET value = value + 1 WHERE id = 1 RETURNING value').toArray()[0].value;
      this.sql.exec('INSERT INTO visits (visit_id, number) VALUES (?, ?)', body.visitId, next);
      return next;
    });
    return Response.json({ number }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
