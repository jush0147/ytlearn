// Pure CORS proxy - relays requests from browser to YouTube
// The browser constructs the YouTube API request, this just forwards it
export default async function handler(req, res) {
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Cache-Control', 'no-cache');

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'url parameter is required' });
    }

    try {
        // Only allow YouTube domains
        const parsed = new URL(url);
        if (!parsed.hostname.endsWith('youtube.com') && !parsed.hostname.endsWith('youtu.be')) {
            return res.status(403).json({ error: 'Only YouTube URLs are allowed' });
        }

        const response = await fetch(url, {
            method: req.method === 'POST' ? 'POST' : 'GET',
            headers: {
                'Content-Type': req.headers['content-type'] || 'application/json',
                'User-Agent': req.headers['x-custom-ua'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
        });

        const contentType = response.headers.get('content-type') || 'text/plain';
        const data = await response.text();

        res.setHeader('Content-Type', contentType);
        return res.status(response.status).send(data);
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}
