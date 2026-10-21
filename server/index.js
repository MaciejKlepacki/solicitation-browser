import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { openDb } from './db.js';
import { rfqRoutes } from './routes/rfqs.js';

const PORT = process.env.PORT || 3001;
const app = express();
const db = openDb();

app.use('/api', rfqRoutes(db));
app.use('/api', (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// In production the Vite build is served by Express; in dev, Vite proxies /api here.
const dist = path.resolve('dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
