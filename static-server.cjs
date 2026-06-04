const fs = require('fs');
const http = require('http');
const path = require('path');

const PORT = process.env.STATIC_PORT ? parseInt(process.env.STATIC_PORT, 10) : 8080;
const ROOT = __dirname;

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function send(res, statusCode, body, type) {
  res.writeHead(statusCode, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const requested = path.normalize(path.join(ROOT, pathname));

  if (!requested.startsWith(ROOT)) {
    send(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(requested, (error, data) => {
    if (error) {
      send(res, 404, 'Not found');
      return;
    }

    send(res, 200, data, TYPES[path.extname(requested)] || 'application/octet-stream');
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Static app running at http://127.0.0.1:${PORT}/`);
});
