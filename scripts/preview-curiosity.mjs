import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import worker, { CuriosityCounter } from '../workers/curiosity-counter/index.mjs';
import { previewStorage } from './curiosity-preview-storage.mjs';
import './build-preview.mjs';

const root = resolve(import.meta.dirname, '..');
const publicDirectory = resolve(root, 'dist');
mkdirSync(resolve(root, '.devdata'), { recursive: true });
const storage = previewStorage(resolve(root, '.devdata/curiosity.sqlite'));
const counter = new CuriosityCounter({ storage });
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml',
};
const server = createServer(async (request, response) => {
  try {
    const origin = 'https://' + request.headers.host;
    const url = new URL(request.url, origin);
    if (url.pathname === '/api/curiosity/visit') {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 256) { response.writeHead(413); response.end(); return; }
        chunks.push(chunk);
      }
      const headers = new Headers(request.headers);
      headers.set('Origin', origin);
      const apiRequest = new Request(url, {
        method: request.method,
        headers,
        ...(request.method === 'POST' ? { body: Buffer.concat(chunks) } : {}),
      });
      const result = await worker.fetch(apiRequest, {
        PREVIEW_ORIGIN: origin,
        CURIOSITY_COUNTER: { idFromName: () => 'preview', get: () => counter },
      });
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
      return;
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const path = resolve(publicDirectory, '.' + pathname);
    if (!path.startsWith(publicDirectory + sep)) { response.writeHead(403); response.end(); return; }
    let body = await readFile(path);
    const type = contentTypes[extname(path)] ?? 'application/octet-stream';
    if (type.startsWith('text/html')) {
      body = Buffer.from(body.toString().replaceAll('https://mariuszgorlowski.com/', '/'));
    }
    response.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});
const portArgument = process.argv.indexOf('--port');
const hostArgument = process.argv.indexOf('--host');
const port = Number(portArgument >= 0 ? process.argv[portArgument + 1] : process.env.PORT ?? 3000);
const host = hostArgument >= 0 ? process.argv[hostArgument + 1] : '0.0.0.0';
server.listen(port, host, () => console.log('Author QR preview ready on port ' + port));
