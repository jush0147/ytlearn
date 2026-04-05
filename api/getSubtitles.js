import https from 'https';

const ANDROID_VERSION = '20.10.38';
const ANDROID_UA = `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 14)`;

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

    // Extract real client IP from request headers (Vercel sets these)
    const clientIp =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        '203.0.113.1'; // fallback to a valid public IP

    console.log(`[getSubtitles] Fetching ${videoId} (${lang}) clientIp=${clientIp}`);

    // Try multiple strategies
    const strategies = [
        // Strategy 1: Android with client IP forwarded
        () => fetchViaInnertube(videoId, lang, clientIp, 'ANDROID', ANDROID_VERSION, ANDROID_UA),
        // Strategy 2: Android without IP forwarding (may work on some Vercel regions)
        () => fetchViaInnertube(videoId, lang, null, 'ANDROID', ANDROID_VERSION, ANDROID_UA),
        // Strategy 3: TV embedded player (sometimes less restricted)
        () => fetchViaInnertube(videoId, lang, clientIp, 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', '2.0',
            'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1'),
    ];

    for (let i = 0; i < strategies.length; i++) {
        try {
            const result = await strategies[i]();
            if (result) {
                console.log(`[getSubtitles] Strategy ${i + 1} succeeded`);
                return res.status(200).json(result);
            }
        } catch (e) {
            console.warn(`[getSubtitles] Strategy ${i + 1} failed: ${e.message}`);
        }
    }

    console.warn('[getSubtitles] All strategies failed');
    return res.status(200).json({ primary: [], secondary: [] });
}

async function fetchViaInnertube(videoId, lang, clientIp, clientName, clientVersion, ua) {
    const body = JSON.stringify({
        context: {
            client: {
                clientName,
                clientVersion,
                ...(clientName === 'ANDROID' ? { androidSdkVersion: 34 } : {}),
                hl: lang,
                gl: 'US',
            },
        },
        videoId,
    });

    const headers = {
        'Content-Type': 'application/json',
        'User-Agent': ua,
    };
    if (clientIp) {
        headers['X-Forwarded-For'] = clientIp;
    }

    const apiRes = await httpsRequest(
        'POST',
        'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
        headers,
        body
    );

    const data = JSON.parse(apiRes.body);
    const playStatus = data.playabilityStatus?.status;

    if (playStatus === 'LOGIN_REQUIRED' || playStatus === 'ERROR') {
        console.log(`[getSubtitles] ${clientName} got ${playStatus}`);
        return null;
    }

    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks?.length) {
        console.log(`[getSubtitles] ${clientName}: no tracks, status=${playStatus}`);
        return null;
    }

    console.log(`[getSubtitles] ${clientName}: found ${tracks.length} tracks`);

    const primaryTrack =
        tracks.find(t => t.languageCode === lang) ||
        tracks.find(t => t.languageCode.startsWith('en')) ||
        tracks[0];

    const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
    const secondaryTrack = tracks.find(t => t.languageCode.startsWith(secondaryLang));

    const fetchXml = async (track) => {
        if (!track) return [];
        try {
            const xmlRes = await httpsRequest('GET', track.baseUrl + '&fmt=srv3', { 'User-Agent': ANDROID_UA });
            if (!xmlRes.body || xmlRes.body.length < 10) return [];
            return parseXml(xmlRes.body);
        } catch { return []; }
    };

    const [primary, secondary] = await Promise.all([
        fetchXml(primaryTrack),
        fetchXml(secondaryTrack),
    ]);

    console.log(`[getSubtitles] primary=${primary.length} secondary=${secondary.length}`);
    return { primary, secondary };
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
