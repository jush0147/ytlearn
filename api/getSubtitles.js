export default async function handler(req, res) {
    const { videoId, lang = 'en' } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'videoId is required' });
    }

    // Set CORS headers early
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=1800');

    try {
        // Strategy 1: Innertube ANDROID API
        let captions = await fetchViaInnertube(videoId, lang);

        // Strategy 2: Fallback to web page scraping
        if (!captions || captions.length === 0) {
            console.log('[getSubtitles] Innertube returned 0 tracks, trying web scrape...');
            captions = await fetchViaWebScrape(videoId, lang);
        }

        if (!captions || captions.length === 0) {
            return res.status(200).json({ primary: [], secondary: [] });
        }

        // Find primary language track
        const primaryTrack =
            captions.find((c) => c.languageCode === lang) ||
            captions.find((c) => c.languageCode.startsWith('en')) ||
            captions[0];

        // Find secondary track
        const secondaryLang = lang.startsWith('en') ? 'zh' : 'en';
        const secondaryTrack =
            captions.find((c) => c.languageCode.startsWith(secondaryLang));

        const [primary, secondary] = await Promise.all([
            fetchAndParseXml(primaryTrack),
            fetchAndParseXml(secondaryTrack),
        ]);

        return res.status(200).json({ primary, secondary });
    } catch (error) {
        console.error('Subtitle fetch error:', error);
        return res.status(500).json({ error: error.message });
    }
}

// ── Strategy 1: Innertube ANDROID API ──────────────────────────────────
async function fetchViaInnertube(videoId, lang) {
    try {
        const response = await fetch(
            'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
                },
                body: JSON.stringify({
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
                }),
            }
        );
        if (!response.ok) return null;
        const data = await response.json();
        return data.captions?.playerCaptionsTracklistRenderer?.captionTracks || null;
    } catch (e) {
        console.error('[Innertube] Error:', e.message);
        return null;
    }
}

// ── Strategy 2: Web page scraping ──────────────────────────────────────
async function fetchViaWebScrape(videoId, lang) {
    try {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept-Language': `${lang},en;q=0.9`,
            },
        });
        if (!response.ok) return null;
        const html = await response.text();

        // Try to extract ytInitialPlayerResponse via balanced-brace parsing
        const captions = extractCaptionsFromHtml(html);
        return captions;
    } catch (e) {
        console.error('[WebScrape] Error:', e.message);
        return null;
    }
}

function extractCaptionsFromHtml(html) {
    // Method 1: JSON parse from var ytInitialPlayerResponse
    const marker = 'var ytInitialPlayerResponse = ';
    let idx = html.indexOf(marker);
    if (idx !== -1) {
        const start = idx + marker.length;
        const jsonStr = extractJsonObject(html, start);
        if (jsonStr) {
            try {
                const data = JSON.parse(jsonStr);
                const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
                if (tracks && tracks.length > 0) return tracks;
            } catch (e) { /* ignore parse error */ }
        }
    }

    // Method 2: Regex for captionTracks directly
    const regex = /"captionTracks":(\[.*?\])/;
    const match = html.match(regex);
    if (match) {
        try {
            const tracks = JSON.parse(match[1]);
            if (tracks.length > 0) return tracks;
        } catch (e) { /* ignore */ }
    }

    // Method 3: Look for captionTracks in ytInitialData or other embedded JSON
    const altRegex = /captionTracks":\s*(\[[\s\S]*?\])\s*,\s*"/;
    const altMatch = html.match(altRegex);
    if (altMatch) {
        try {
            const tracks = JSON.parse(altMatch[1]);
            if (tracks.length > 0) return tracks;
        } catch (e) { /* ignore */ }
    }

    return null;
}

function extractJsonObject(str, startIdx) {
    if (str[startIdx] !== '{') return null;
    let depth = 0;
    for (let i = startIdx; i < str.length; i++) {
        if (str[i] === '{') depth++;
        else if (str[i] === '}') {
            depth--;
            if (depth === 0) {
                return str.slice(startIdx, i + 1);
            }
        }
    }
    return null;
}

// ── Shared: Fetch & Parse XML ──────────────────────────────────────────
async function fetchAndParseXml(track) {
    if (!track) return [];
    const url = track.baseUrl + '&fmt=srv3';
    const xmlRes = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
    });
    const xml = await xmlRes.text();
    return parseSubtitleXml(xml);
}

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

    // srv3 format: <p t="ms" d="ms">text</p>
    const pRegex = /<p[^>]*t="(\d+)"[^>]*d="(\d+)"[^>]*>(.*?)<\/p>/gs;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
        const start = parseInt(match[1]) / 1000;
        const dur = parseInt(match[2]) / 1000;
        const text = decodeEntities(match[3]);
        if (text) segments.push({ start, dur, text });
    }

    // Fallback: timedtext format: <text start="s" dur="s">text</text>
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
