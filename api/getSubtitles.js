import https from 'https';

const ANDROID_UA = 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)';

function httpsRequest(method, url, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const opts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method,
            headers,
        };
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
        const req = https.request(opts, (res) => {
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
        });
        req.on('error', reject);
        req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

export default async function handler(req, res) {
    const { videoId, lang = 'en' } = req.query || {};
    if (!videoId) return res.status(400).json({ error: 'Missing videoId' });

    console.log(`[getSubtitles] Fetching ${videoId} (${lang})`);

    try {
        // Step 1: Get caption tracks via Innertube ANDROID
        const body = JSON.stringify({
            context: {
                client: {
                    clientName: 'ANDROID',
                    clientVersion: '20.10.38',
                    androidSdkVersion: 34,
                    hl: lang,
                    gl: 'US',
                },
            },
            videoId,
        });

        const apiRes = await httpsRequest(
            'POST',
            'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
            { 'Content-Type': 'application/json', 'User-Agent': ANDROID_UA },
            body
        );

        const data = JSON.parse(apiRes.body);
        const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (!tracks?.length) {
            console.log(`[getSubtitles] No tracks: ${data.playabilityStatus?.status}`);
            return res.status(200).json({ primary: [], secondary: [] });
        }

        console.log(`[getSubtitles] Found ${tracks.length} tracks`);

        // Step 2: Pick tracks
        const primaryTrack =
            tracks.find(t => t.languageCode === lang) ||
            tracks.find(t => t.languageCode.startsWith('en')) ||
            tracks[0];

        const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
        const secondaryTrack = tracks.find(t => t.languageCode.startsWith(secondaryLang));

        // Step 3: Fetch XML using Android UA (this makes YouTube return proper content)
        const fetchXml = async (track) => {
            if (!track) return [];
            try {
                const url = track.baseUrl + '&fmt=srv3';
                const xmlRes = await httpsRequest('GET', url, { 'User-Agent': ANDROID_UA });
                if (!xmlRes.body || xmlRes.body.length < 10) return [];
                return parseXml(xmlRes.body);
            } catch (e) {
                console.error('[getSubtitles] XML fetch error:', e.message);
                return [];
            }
        };

        const [primary, secondary] = await Promise.all([
            fetchXml(primaryTrack),
            fetchXml(secondaryTrack),
        ]);

        console.log(`[getSubtitles] primary: ${primary.length}, secondary: ${secondary.length}`);
        return res.status(200).json({ primary, secondary });

    } catch (e) {
        console.error('[getSubtitles] Error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}

function parseXml(xml) {
    const segments = [];
    let match;

    // srv3: <p t="ms" d="ms">...</p>
    const pRegex = /<p[^>]*\bt="(\d+)"[^>]*\bd="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    while ((match = pRegex.exec(xml)) !== null) {
        const start = parseInt(match[1]) / 1000;
        const dur = parseInt(match[2]) / 1000;
        const text = decodeEntities(match[3]);
        if (text) segments.push({ start, dur, text });
    }

    if (segments.length > 0) return segments;

    // timedtext fallback: <text start="s" dur="s">...</text>
    const textRegex = /<text[^>]*\bstart="([\d.]+)"[^>]*\bdur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    while ((match = textRegex.exec(xml)) !== null) {
        const start = parseFloat(match[1]);
        const dur = parseFloat(match[2]);
        const text = decodeEntities(match[3]);
        if (text) segments.push({ start, dur, text });
    }

    return segments;
}

function decodeEntities(str) {
    return str
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCodePoint(parseInt(c, 16)))
        .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(parseInt(c, 10)))
        .replace(/\n/g, ' ')
        .trim();
}
