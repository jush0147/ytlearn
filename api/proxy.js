import https from 'https';
import http from 'http';

export default async function handler(req, res) {
    const { url } = req.query || {};

    if (!url) {
        return res.status(400).json({ error: 'Missing target URL' });
    }

    if (!url.startsWith('https://www.youtube.com/') && !url.startsWith('https://video.google.com/')) {
        return res.status(403).json({ error: 'Only YouTube URLs are allowed' });
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Custom-UA');
        return res.status(200).end();
    }

    try {
        const parsed = new URL(url);
        const mod = url.startsWith('https') ? https : http;

        // Get the real client IP to forward to YouTube
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
                         req.headers['x-real-ip'] ||
                         req.socket?.remoteAddress ||
                         '127.0.0.1';

        const reqOpts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: req.method,
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'User-Agent': req.headers['x-custom-ua'] || 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
                'X-Forwarded-For': clientIp,
                'X-Real-IP': clientIp,
            }
        };

        const proxyReq = mod.request(reqOpts, (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, {
                'Content-Type': proxyRes.headers['content-type'] || 'text/plain',
                'Access-Control-Allow-Origin': '*',
            });

            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('[Proxy] Error:', err.message);
            if (!res.headersSent) res.status(500).json({ error: 'Proxy failed', details: err.message });
        });

        if (req.method === 'POST') {
            req.pipe(proxyReq);
        } else {
            proxyReq.end();
        }
    } catch (error) {
        res.status(500).json({ error: 'Invalid URL or proxy error', details: error.message });
    }
}
