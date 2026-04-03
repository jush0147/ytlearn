import https from 'https';

async function fetchUrl(url, headers = {}) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            const chunks = [];
            res.on('data', (d) => chunks.push(d));
            res.on('end', () => resolve(Buffer.concat(chunks).toString()));
        }).on('error', reject);
    });
}

function parseTranscript(xml) {
    const segments = [];
    const regex = /<text start="([\d.]+)" dur="([\d.]+)">(.*?)<\/text>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
        let text = match[3]
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'");
        segments.push({
            start: parseFloat(match[1]),
            duration: parseFloat(match[2]),
            text
        });
    }
    return segments;
}

export default async function handler(req, res) {
    const { videoId, lang = 'en' } = req.query || {};
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

    console.log(`[getSubtitles] Fetching ${videoId} (${lang})`);

    try {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const html = await fetchUrl(watchUrl, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        });

        const match = html.match(/"captionTracks":(\[.*?\])/);
        if (!match) {
            return res.status(404).json({ error: 'No caption tracks found in HTML' });
        }

        const tracks = JSON.parse(match[1]);
        const track = tracks.find(t => t.languageCode === lang) || tracks[0];
        
        console.log(`[getSubtitles] Using track: ${track.languageCode} (${track.kind || 'manual'})`);
        
        const xml = await fetchUrl(track.baseUrl + '&fmt=srv3');
        if (!xml || xml.length < 10) {
            return res.status(403).json({ error: 'YouTube returned empty captions for this IP' });
        }

        const segments = parseTranscript(xml);
        return res.status(200).json(segments);

    } catch (e) {
        console.error('[getSubtitles] Error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}
