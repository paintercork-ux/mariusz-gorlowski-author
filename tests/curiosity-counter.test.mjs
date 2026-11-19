import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import worker, { CuriosityCounter } from '../workers/curiosity-counter/index.mjs';
import { previewStorage } from '../scripts/curiosity-preview-storage.mjs';

function request(id, origin = 'https://mariuszgorlowski.com') {
  return new Request('https://counter.example/api/curiosity/visit', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitId: id }),
  });
}

test('shared count starts at 1000 and returning sessions see the current total without increasing it', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'author-curiosity-'));
  const filename = join(directory, 'counter.sqlite');
  let storage = previewStorage(filename);
  let counter = new CuriosityCounter({ storage });
  const env = { CURIOSITY_COUNTER: { idFromName: () => 'global', get: () => counter } };
  const firstId = randomUUID();
  const first = await worker.fetch(request(firstId), env);
  assert.equal((await first.json()).number, 1001);
  const retry = await worker.fetch(request(firstId), env);
  assert.equal((await retry.json()).number, 1001);

  const results = await Promise.all(Array.from({ length: 20 }, async () => {
    const result = await worker.fetch(request(randomUUID()), env);
    return (await result.json()).number;
  }));
  assert.deepEqual(results.sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => 1002 + i));
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await (await worker.fetch(request(firstId), env)).json()).number, 1021);
  }
  storage.database.close();

  storage = previewStorage(filename);
  counter = new CuriosityCounter({ storage });
  assert.equal((await (await worker.fetch(request(firstId), env)).json()).number, 1021);
  assert.equal((await (await worker.fetch(request(randomUUID()), env)).json()).number, 1022);
  assert.equal((await (await worker.fetch(request(firstId), env)).json()).number, 1022);
  storage.database.close();
  rmSync(directory, { recursive: true });
});

test('invalid requests and foreign origins leave the count intact', async () => {
  const storage = previewStorage(':memory:');
  const counter = new CuriosityCounter({ storage });
  const env = { CURIOSITY_COUNTER: { idFromName: () => 'global', get: () => counter } };
  assert.equal((await worker.fetch(request('invalid'), env)).status, 400);
  assert.equal((await worker.fetch(request(randomUUID(), 'https://other.example'), env)).status, 403);
  const result = await worker.fetch(request(randomUUID()), env);
  assert.equal((await result.json()).number, 1001);
  assert.equal(result.headers.get('Cache-Control'), 'no-store');
  assert.equal(result.headers.get('Access-Control-Allow-Origin'), 'https://mariuszgorlowski.com');
  const preflight = await worker.fetch(new Request('https://counter.example/api/curiosity/visit', {
    method: 'OPTIONS', headers: { Origin: 'https://mariuszgorlowski.com' },
  }), env);
  assert.equal(preflight.status, 204);
  storage.database.close();
});
