import https from 'https';

const ANDROID_UA = 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)';

function httpsRequest(method, url, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const opts = { hostname: parsed.hostname, path: parsed.pathname + parsed.search, method, headers };
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

    const apiKey = process.env.YOUTUBE_API_KEY;

    console.log(`[getSubtitles] Fetching ${videoId} (${lang}), hasApiKey=${!!apiKey}`);

    try {
        let tracks = null;

        // Strategy 1: Use YOUTUBE_API_KEY to get caption list via official API
        if (apiKey) {
            tracks = await fetchViaOfficialApi(videoId, lang, apiKey);
        }

        // Strategy 2: Fallback - Innertube ANDROID (works on non-Vercel IPs)
        if (!tracks?.length) {
            tracks = await fetchViaInnertube(videoId, lang);
        }

        if (!tracks?.length) {
            console.log(`[getSubtitles] No tracks found`);
            return res.status(200).json({ primary: [], secondary: [] });
        }

        console.log(`[getSubtitles] Found ${tracks.length} tracks`);

        const primaryTrack = tracks.find(t => t.languageCode === lang) ||
            tracks.find(t => t.languageCode.startsWith('en')) || tracks[0];
        const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
        const secondaryTrack = tracks.find(t => t.languageCode.startsWith(secondaryLang));

        const fetchXml = async (track) => {
            if (!track) return [];
            try {
                const xmlRes = await httpsRequest('GET', track.baseUrl + '&fmt=srv3', {
                    'User-Agent': ANDROID_UA
                });
                if (!xmlRes.body || xmlRes.body.length < 10) return [];
                return parseXml(xmlRes.body);
            } catch { return []; }
        };

        const [primary, secondary] = await Promise.all([
            fetchXml(primaryTrack),
            fetchXml(secondaryTrack),
        ]);

        console.log(`[getSubtitles] primary=${primary.length} secondary=${secondary.length}`);
        return res.status(200).json({ primary, secondary });

    } catch (e) {
        console.error('[getSubtitles] Error:', e.message);
        return res.status(500).json({ error: e.message });
    }
}

/**
 * Use official YouTube Data API v3 to get captions list.
 * The API gives us caption IDs but NOT direct download URLs.
 * However, we can construct the timedtext URL from the video ID and language.
 */
async function fetchViaOfficialApi(videoId, lang, apiKey) {
    try {
        // Step 1: List available captions via official API
        const url = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
        const res = await httpsRequest('GET', url, {
            'Accept': 'application/json'
        });

        if (res.status !== 200) {
            console.log(`[getSubtitles] Official API returned ${res.status}`);
            return null;
        }

        const data = JSON.parse(res.body);
        const items = data.items || [];

        if (!items.length) {
            console.log(`[getSubtitles] Official API: no captions found`);
            return null;
        }

        console.log(`[getSubtitles] Official API: found ${items.length} caption tracks`);

        // Step 2: Use Innertube to get actual signed baseUrls for these tracks
        // (Official API only gives IDs, not download URLs)
        const innerTracks = await fetchViaInnertube(videoId, lang);
        if (innerTracks?.length) return innerTracks;

        // If Innertube is blocked, construct basic timedtext URLs
        // These work without signing for some videos
        return items.map(item => ({
            languageCode: item.snippet.language,
            baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${item.snippet.language}&kind=${item.snippet.trackKind === 'asr' ? 'asr' : ''}`,
            name: { simpleText: item.snippet.name || item.snippet.language },
            kind: item.snippet.trackKind === 'asr' ? 'asr' : undefined,
        }));

    } catch (e) {
        console.warn('[getSubtitles] Official API failed:', e.message);
        return null;
    }
}

async function fetchViaInnertube(videoId, lang) {
    try {
        const body = JSON.stringify({
            context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', androidSdkVersion: 34, hl: lang, gl: 'US' } },
            videoId
        });
        const res = await httpsRequest('POST', 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
            { 'Content-Type': 'application/json', 'User-Agent': ANDROID_UA }, body);
        const data = JSON.parse(res.body);
        if (data.playabilityStatus?.status === 'LOGIN_REQUIRED') return null;
        return data.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
    } catch { return null; }
}

function parseXml(xml) {
    const segments = [];
    let match;
    const pRegex = /<p[^>]*\bt="(\d+)"[^>]*\bd="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    while ((match = pRegex.exec(xml)) !== null) {
        const text = decodeEntities(match[3]);
        if (text) segments.push({ start: parseInt(match[1]) / 1000, dur: parseInt(match[2]) / 1000, text });
    }
    if (segments.length > 0) return segments;
    const textRegex = /<text[^>]*\bstart="([\d.]+)"[^>]*\bdur="([\d.]+)"[^>]*>([\s\S]*?)<\/text>/g;
    while ((match = textRegex.exec(xml)) !== null) {
        const text = decodeEntities(match[3]);
        if (text) segments.push({ start: parseFloat(match[1]), dur: parseFloat(match[2]), text });
    }
    return segments;
}

function decodeEntities(str) {
    return str
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCodePoint(parseInt(c, 16)))
        .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(parseInt(c, 10)))
        .replace(/\n/g, ' ').trim();
}
