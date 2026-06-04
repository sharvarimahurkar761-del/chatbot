const http = require('http');
const https = require('https');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4245;
const TARGET = process.env.LLAMA_TARGET || 'http://tmlpnewskc31137.tmindia.tatamotors.com:4244';

function sendCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendProxyError(res, error) {
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Model server unavailable',
    detail: error.message
  }));
}

const server = http.createServer((req, res) => {
  sendCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const targetUrl = new URL(req.url, TARGET);
  const isHttps = targetUrl.protocol === 'https:';
  const client = isHttps ? https : http;
  const headers = { ...req.headers };
  delete headers.host;

  const proxyReq = client.request({
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers,
    timeout: 30000
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => sendProxyError(res, error));
  proxyReq.on('timeout', () => {
    proxyReq.destroy(new Error('Request timed out'));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Forwarding requests to ${TARGET}`);
});

server.on('error', (error) => {
  console.error('Proxy server error:', error.message);
  process.exit(1);
});
