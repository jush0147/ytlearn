import https from 'https';

/**
 * This endpoint ONLY returns caption track metadata (baseUrl).
 * The client browser will then fetch the actual XML directly,
 * bypassing the server-IP vs youtube-signature mismatch.
 */
export default async function handler(req, res) {
    const { videoId, lang = 'en' } = req.query || {};
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

    console.log(`[getSubtitles] Fetching ${videoId} (${lang})`);

    try {
        const html = await httpsGet(`https://www.youtube.com/watch?v=${videoId}`, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        });

        const match = html.match(/"captionTracks":(\[.*?\])/);
        if (!match) {
            console.log('[getSubtitles] No captionTracks found in HTML');
            return res.status(200).json({ tracks: [] });
        }

        const tracks = JSON.parse(match[1]);
        console.log(`[getSubtitles] Found ${tracks.length} tracks`);

        // Return tracks with baseUrl so client can fetch XML directly (bypasses server IP block)
        return res.status(200).json({ tracks });
    } catch (e) {
        console.error('[getSubtitles] Error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}

function httpsGet(url, headers) {
    return new Promise((resolve, reject) => {
        const opts = {
            hostname: 'www.youtube.com',
            path: url.replace('https://www.youtube.com', ''),
            method: 'GET',
            headers,
        };
        const req = https.request(opts, (res) => {
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}
