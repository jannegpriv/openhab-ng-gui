// Simple Node.js proxy for myopenHAB REST API (ES module version)
// Usage: node openhab-proxy.js
// Then point your React app to http://localhost:3001/rest/bindings etc.

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Proxy any /rest/* route to myopenhab.org/rest/*
app.all(/^\/rest(\/.*)?$/, async (req, res) => {
  console.log('Proxy received request:', req.method, req.originalUrl);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  // Accept Authorization and X-OPENHAB-TOKEN headers
  const authHeader = req.headers['authorization'];
  const ohToken = req.headers['x-openhab-token'];
  // Forward the full original URL (path + all query parameters)
  let apiUrl = `https://home.myopenhab.org${req.originalUrl}`;

  if (!authHeader || !ohToken) {
    return res.status(401).json({ error: 'Missing Authorization or openHAB API token' });
  }

  try {
    const openhabRes = await fetch(apiUrl, {
      method: req.method,
      headers: {
        'Authorization': authHeader,
        'X-OPENHAB-TOKEN': ohToken,
        'Accept': 'application/json',
        'Content-Type': req.get('content-type') || 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    const contentType = openhabRes.headers.get('content-type');
    res.status(openhabRes.status);
    if (contentType) {
      res.set('Content-Type', contentType);
    }
    // Stream the response directly to the client
    openhabRes.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`openHAB proxy running at http://localhost:${PORT}`);
});
