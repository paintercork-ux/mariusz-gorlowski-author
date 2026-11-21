import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const item of readdirSync(root, { withFileTypes: true })) {
  const isPageAsset = item.isFile() && /\.(html|css|js|xml)$/u.test(item.name);
  const isPageFolder = ['assets', 'data', 'writing', 'qr-finder', 'contact', 'pl', 'curiosity', 'notebook', 'ai-guide', 'seven-faces-of-ai'].includes(item.name);
  if (isPageAsset || isPageFolder) cpSync(resolve(root, item.name), resolve(output, item.name), { recursive: true });
}
execFileSync('python3', [resolve(root, 'scripts/build_newsletter.py'), '--preview', output], { stdio: 'inherit' });
console.log('Author site preview built in dist.');
