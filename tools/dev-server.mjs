import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = normalize(join(fileURLToPath(new URL('.', import.meta.url)), '..'));
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png'
};

const server = createServer(async (request, response) => {
  try {
    const rawPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = rawPath === '/' ? 'index.html' : rawPath.replace(/^\//, '');
    let filePath = normalize(join(root, relative));
    if (!filePath.startsWith(root)) throw new Error('Invalid path');
    if ((await stat(filePath)).isDirectory()) filePath = join(filePath, 'index.html');
    response.writeHead(200, {
      'Content-Type': types[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    response.end(await readFile(filePath));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Adventure Dinner ready at http://127.0.0.1:${port}`);
});
