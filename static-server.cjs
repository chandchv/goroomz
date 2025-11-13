// static-server.cjs (CommonJS)
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

const BUILD_DIR = path.join(__dirname, 'dist');
// Serve static assets, but don't auto-serve index.html
app.use(
  express.static(BUILD_DIR, {
    index: false,
    maxAge: '1h',
    setHeaders(res, filePath) {
      if (path.extname(filePath) === '.html') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    },
  })
);

// SPA fallback — **no wildcard path**
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  if (req.path.includes('.')) return next(); // looks like a real file
  res.sendFile(path.join(BUILD_DIR, 'index.html'), (err) => (err ? next(err) : undefined));
});

// Optional 404
app.use((req, res) => res.status(404).send('Not Found'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).send('Internal Server Error');
});

app.listen(port, host, () => {
  console.log(`React Static Server running on ${host}:${port}`);
});
