import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.mp3':'audio/mpeg', '.txt':'text/plain; charset=utf-8' };
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const relative = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^[/\\]+/, '');
    const target = resolve(root, relative);
    if (target !== root && !target.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }
    const body = await readFile(target); res.writeHead(200, { 'content-type': types[extname(target)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body);
  } catch { res.writeHead(404).end('Not found'); }
});
const host = process.env.HOST || '0.0.0.0'; const port = Number(process.env.PORT || 4173);
server.listen(port, host, () => console.log(`Learning sample server listening at http://${host}:${port}`));
