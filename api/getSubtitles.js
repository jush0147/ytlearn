// This serverless function acts as a thin CORS proxy.
// The browser sends the target YouTube URL, and we just relay it.
export default async function handler(req, res) {
    const { videoId, lang = 'en' } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    // Short cache so retries with different strategies hit fresh
    res.setHeader('Cache-Control', 's-maxage=600');

    try {
        // Try all strategies sequentially
        const result = await tryAllStrategies(videoId, lang);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Subtitle fetch error:', error);
        return res.status(500).json({ error: error.message });
    }
}

async function tryAllStrategies(videoId, lang) {
    const empty = { primary: [], secondary: [] };

    // Strategy 1: Innertube ANDROID
    console.log('[S1] Trying Innertube ANDROID...');
    let captions = await fetchViaInnertube(videoId, lang, 'ANDROID', '20.10.38');
    if (captions?.length) {
        console.log('[S1] Success:', captions.length, 'tracks');
        return await buildResult(captions, lang);
    }

    // Strategy 2: Innertube WEB
    console.log('[S2] Trying Innertube WEB...');
    captions = await fetchViaInnertube(videoId, lang, 'WEB', '2.20240530.02.00');
    if (captions?.length) {
        console.log('[S2] Success:', captions.length, 'tracks');
        return await buildResult(captions, lang);
    }

    // Strategy 3: Innertube TVHTML5_SIMPLY_EMBEDDED
    console.log('[S3] Trying Innertube TV Embedded...');
    captions = await fetchViaInnertube(videoId, lang, 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', '2.0');
    if (captions?.length) {
        console.log('[S3] Success:', captions.length, 'tracks');
        return await buildResult(captions, lang);
    }

    // Strategy 4: Web scrape ytInitialPlayerResponse
    console.log('[S4] Trying web scrape...');
    captions = await fetchViaWebScrape(videoId, lang);
    if (captions?.length) {
        console.log('[S4] Success:', captions.length, 'tracks');
        return await buildResult(captions, lang);
    }

    // Strategy 5: Direct timedtext API (auto-generated captions)
    console.log('[S5] Trying direct timedtext API...');
    const directResult = await fetchViaTimedText(videoId, lang);
    if (directResult?.primary?.length) {
        console.log('[S5] Success:', directResult.primary.length, 'segments');
        return directResult;
    }

    console.log('[All] All strategies failed for', videoId);
    return empty;
}

// ── Innertube API (configurable client) ────────────────────────────────
async function fetchViaInnertube(videoId, lang, clientName, clientVersion) {
    try {
        const clientConfig = {
            clientName,
            clientVersion,
            hl: lang,
            gl: 'US',
        };

        // Add Android-specific fields
        if (clientName === 'ANDROID') {
            clientConfig.androidSdkVersion = 34;
        }

        const userAgent = clientName === 'ANDROID'
            ? `com.google.android.youtube/${clientVersion} (Linux; U; Android 14)`
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

        const response = await fetch(
            'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': userAgent,
                },
                body: JSON.stringify({
                    context: { client: clientConfig },
                    videoId,
                }),
            }
        );
        if (!response.ok) return null;
        const data = await response.json();
        return data.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
    } catch (e) {
        console.error(`[Innertube:${clientName}] Error:`, e.message);
        return null;
    }
}

// ── Web page scraping ──────────────────────────────────────────────────
async function fetchViaWebScrape(videoId, lang) {
    try {
        const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept-Language': `${lang},en;q=0.9`,
            },
        });
        if (!response.ok) return null;
        const html = await response.text();

        // balanced-brace JSON extraction
        const marker = 'var ytInitialPlayerResponse = ';
        const idx = html.indexOf(marker);
        if (idx !== -1) {
            const start = idx + marker.length;
            let depth = 0;
            for (let i = start; i < html.length; i++) {
                if (html[i] === '{') depth++;
                else if (html[i] === '}') {
                    depth--;
                    if (depth === 0) {
                        try {
                            const data = JSON.parse(html.slice(start, i + 1));
                            const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                            if (tracks?.length) return tracks;
                        } catch { /* ignore */ }
                        break;
                    }
                }
            }
        }

        // regex fallback
        const match = html.match(/"captionTracks":(\[.*?\])/);
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch { /* ignore */ }
        }

        return null;
    } catch (e) {
        console.error('[WebScrape] Error:', e.message);
        return null;
    }
}

// ── Direct timedtext API ───────────────────────────────────────────────
async function fetchViaTimedText(videoId, lang) {
    try {
        // Try fetching auto-generated captions directly
        const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv3`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
        });
        if (!response.ok) return null;
        const xml = await response.text();
        if (!xml || xml.length < 50) return null;
        const primary = parseSubtitleXml(xml);
        if (primary.length === 0) return null;
        return { primary, secondary: [] };
    } catch (e) {
        console.error('[TimedText] Error:', e.message);
        return null;
    }
}

// ── Build result from caption tracks ───────────────────────────────────
async function buildResult(captions, lang) {
    const primaryTrack =
        captions.find((c) => c.languageCode === lang) ||
        captions.find((c) => c.languageCode.startsWith('en')) ||
        captions[0];

    const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
    const secondaryTrack =
        captions.find((c) => c.languageCode.startsWith(secondaryLang));

    const [primary, secondary] = await Promise.all([
        fetchAndParseXml(primaryTrack),
        fetchAndParseXml(secondaryTrack),
    ]);

    return { primary, secondary };
}

async function fetchAndParseXml(track) {
    if (!track) return [];
    const url = track.baseUrl + '&fmt=srv3';
    const xmlRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const xml = await xmlRes.text();
    return parseSubtitleXml(xml);
}

// ── XML Parsing ────────────────────────────────────────────────────────
function decodeEntities(str) {
    return str
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
        .replace(/\n/g, ' ')
        .trim();
}

function parseSubtitleXml(xml) {
    const segments = [];

    // srv3 format
    const pRegex = /<p[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>(.*?)<\/p>/gs;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
        const start = parseInt(match[1]) / 1000;
        const dur = parseInt(match[2]) / 1000;
        const text = decodeEntities(match[3]);
        if (text) segments.push({ start, dur, text });
    }

    // timedtext fallback
    if (segments.length === 0) {
        const textRegex = /<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>(.*?)<\/text>/gs;
        while ((match = textRegex.exec(xml)) !== null) {
            const start = parseFloat(match[1]);
            const dur = parseFloat(match[2]);
            const text = decodeEntities(match[3]);
            if (text) segments.push({ start, dur, text });
        }
    }

    return segments;
}
